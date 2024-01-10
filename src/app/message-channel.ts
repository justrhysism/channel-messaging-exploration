import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import uniqueId from "lodash-es/uniqueId";

export enum MessageChannelEventType {
	HANDSHAKE,
	PRIMITIVE,
	DATA,
}

type HandshakeEvent = {
	type: MessageChannelEventType.HANDSHAKE;
	data: string;
};

type PrimitiveEvent = {
	type: MessageChannelEventType.PRIMITIVE;
	data: string;
};

type ObjectEvent = {
	type: MessageChannelEventType.DATA;
	data: Record<string, unknown>;
};

export type MessageChannelEvent = PrimitiveEvent | ObjectEvent;
type MessageChannelEventInternal = MessageChannelEvent & {
	_handshakeId: string;
};

export type MessageHandler = (event: MessageChannelEvent) => void;

interface MessageChannelParentProps {
	target: HTMLIFrameElement | null | undefined;
	onMessage?: MessageHandler;
}

export function useMessageChannelParent({
	target,
	onMessage,
}: MessageChannelParentProps) {
	// Provide a simpler API by not requiring a referentially stable `onMessage`
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;

	// const [handshakeId, setHandshakeId] = useState("");
	const handshakeIdRef = useRef("");

	const [isConnected, setConnected] = useState(false);
	const [channel, setChannel] = useState<MessageChannel | null>(null);

	const handleMessage = useCallback(
		(event: MessageEvent<MessageChannelEventInternal | HandshakeEvent>) => {
			const { type, data } = event.data;

			if (type === MessageChannelEventType.HANDSHAKE) {
				if (data === handshakeIdRef.current) {
					setConnected(true);
				}
				return;
			}

			if (event.data._handshakeId !== handshakeIdRef.current) return;
			onMessageRef.current?.(event.data);
		},
		[],
	);

	const connect = useCallback(() => {
		if (!target || !target.contentWindow) {
			return;
		}

		const handshakeId = createHandshakeId();
		handshakeIdRef.current = handshakeId;

		const channel = new MessageChannel();
		setChannel(channel);

		if (handleMessage) {
			channel.port1.onmessage = handleMessage;
		}

		target.contentWindow.postMessage(
			{ type: MessageChannelEventType.HANDSHAKE, data: handshakeId },
			window.location.origin,
			[channel.port2],
		);
	}, [handleMessage, target]);

	const reconnect = useCallback(() => {
		setConnected(false);
		setChannel(null);
		handshakeIdRef.current = "";
		connect();
	}, [connect]);

	// Auto connect
	useEffect(() => {
		if (!target) return;
		setTimeout(connect); // TODO: make smarter and re-attempt until connection achieved
	}, [connect, target]);

	function postMessage(event: MessageChannelEvent): void {
		const _event = {
			...event,
			_handshakeId: handshakeIdRef.current,
		};

		channel?.port1.postMessage(_event);
	}

	return { postMessage, reconnect, isConnected };
}

interface MessageChannelChildProps {
	onMessage: MessageHandler;
}

export function useMessageChannelChild({
	onMessage,
}: MessageChannelChildProps) {
	// Provide a simpler API by not requiring a referentially stable `onMessage`
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;

	const [messagePort, setMessagePort] = useState<MessagePort | null>(null);
	const [handshakeId, setHandshakeId] = useState("");
	const isConnected = Boolean(messagePort);

	const handleMessage = useCallback(
		(event: MessageEvent<MessageChannelEventInternal>) => {
			const { _handshakeId, ...data } = event.data;
			if (handshakeId !== _handshakeId) return;
			onMessageRef.current?.(data);
		},
		[handshakeId],
	);

	useEffect(() => {
		function initialise(event: MessageEvent<HandshakeEvent>) {
			if (event.origin !== window.location.origin) {
				console.error("Invalid origin", event.origin);
				return;
			}

			const { data, type } = event.data;
			if (type !== MessageChannelEventType.HANDSHAKE) return;

			if (!event.ports) {
				console.error("No ports received");
				return;
			}

			const port = event.ports[0];
			setMessagePort(port);

			// Establish handshake
			setHandshakeId(data);
			port.postMessage(event.data);
		}

		// Initialise events are sent to the window
		window.addEventListener("message", initialise);

		return () => {
			window.removeEventListener("message", initialise);
		};
	}, []);

	// Once we have the `messagePort` we can assign the handler
	useEffect(() => {
		if (!messagePort) return;
		messagePort.onmessage = handleMessage;
	}, [handleMessage, messagePort]);

	function postMessage(event: MessageChannelEvent): void {
		if (!messagePort) return;
		const _event = {
			...event,
			_handshakeId: handshakeId,
		};

		messagePort.postMessage(_event);
	}

	return { postMessage, isConnected };
}

function createHandshakeId() {
	return uniqueId("handshake");
}
