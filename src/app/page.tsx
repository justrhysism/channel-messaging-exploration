"use client";

import { Button } from "@nextui-org/button";
import * as React from "react";
import { useCallback, useState } from "react";
import {
	MessageChannelEventType,
	useMessageChannelParent,
} from "./message-channel";

export default function Home() {
	const [primitiveMessageList, setPrimitiveMessageList] = useState<string[]>(
		[],
	);
	const addPrimitiveMessage = useCallback(
		(message: string) =>
			setPrimitiveMessageList((prevMessages) => [...prevMessages, message]),
		[],
	);

	const [objectMessageList, setObjectMessageList] = useState<
		Record<string, unknown>[]
	>([]);
	const addDataMessage = useCallback(
		(data: Record<string, unknown>) =>
			setObjectMessageList((prevMessages) => [...prevMessages, data]),
		[],
	);

	const [iframe, iframeRef] = useState<HTMLIFrameElement | null>(null);

	const { postMessage, reconnect, isConnected } = useMessageChannelParent({
		target: iframe,
		onMessage: (event) => {
			switch (event.type) {
				case MessageChannelEventType.DATA:
					addDataMessage(event.data);
					break;
				case MessageChannelEventType.PRIMITIVE:
					addPrimitiveMessage(event.data);
					break;
			}
		},
	});

	// Uncomment to test native message queueing—ensure the `setTimeout` in `message-channel.ts` is set to 1s or so
	// postMessage(`foo-${Date.now()}`);
	// postMessage(`foo-${Date.now()}-second`);

	const handlePrimitiveButtonClick = () => {
		if (!postMessage) {
			return;
		}

		const data = Date.now().toString();
		postMessage({ type: MessageChannelEventType.PRIMITIVE, data });
	};

	const handleDataButtonClick = () => {
		if (!postMessage) {
			return;
		}

		const data = { date: Date.now() };
		postMessage({ type: MessageChannelEventType.DATA, data });
	};

	return (
		<main className="flex min-h-screen flex-col items-center p-24">
			<div className="text-xs text-teal-800">
				{isConnected ? "handshake confirmed" : "awaiting handshake"}
			</div>
			<div className="grow flex gap-2 items-center">
				<Button color="primary" onClick={handlePrimitiveButtonClick}>
					Send Primitive
				</Button>
				<Button
					color="primary"
					variant="bordered"
					onClick={handleDataButtonClick}
				>
					Send Object
				</Button>
				<Button onClick={reconnect}>Reconnect</Button>
			</div>

			<div className="grow flex gap-4">
				<ul className="grow my-4">
					{primitiveMessageList.map((message) => (
						<li key={message}>{message}</li>
					))}
				</ul>
				<ul className="grow my-4">
					{objectMessageList.map((data) => (
						<li key={JSON.stringify(data)}>{JSON.stringify(data)}</li>
					))}
				</ul>
			</div>

			<div className="grow w-full flex relative">
				<div className="bg-black text-xs absolute text-teal-800 -top-4 left-1/2 transform -translate-x-1/2 p-2">
					iframe content
				</div>
				<iframe
					ref={iframeRef}
					src="/iframe"
					className="border-5 border-double border-teal-900 w-full"
					onLoadStart={(e) => console.log("onLoadStart", e)}
					onLoad={(e) => console.log("onLoad", e)}
				/>
			</div>
		</main>
	);
}

function Frame(props: React.ComponentProps<"iframe">) {}
