"use client";

import { Button } from "@nextui-org/button";
import * as React from "react";
import { useCallback, useState } from "react";
import {
	MessageChannelEventType,
	useMessageChannelChild,
} from "../message-channel";

export default function Page() {
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

	const { postMessage, isConnected } = useMessageChannelChild({
		onMessage: (event) => {
			switch (event.type) {
				case MessageChannelEventType.PRIMITIVE:
					addPrimitiveMessage(event.data);
					break;
				case MessageChannelEventType.DATA:
					addDataMessage(event.data);
					break;
			}
		},
	});

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
		<div className="text-center p-2">
			<div className="text-xs text-teal-800">
				{isConnected ? "connected" : "awaiting connection"}
			</div>
			<main className="flex min-h-screen flex-col items-center p-8">
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
			</main>
		</div>
	);
}
