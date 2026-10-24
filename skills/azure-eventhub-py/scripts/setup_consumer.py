#!/usr/bin/env python3
"""
CLI tool for Azure Event Hubs consumer setup and monitoring.

Usage:
    # Show Event Hub info
    python setup_consumer.py info --namespace mynamespace --eventhub myeventhub

    # Show partition details
    python setup_consumer.py partitions --namespace mynamespace --eventhub myeventhub

    # Receive events (simple)
    python setup_consumer.py receive --namespace mynamespace --eventhub myeventhub

    # Receive with checkpointing
    python setup_consumer.py receive --namespace mynamespace --eventhub myeventhub \
        --storage-account mystorageaccount --checkpoint-container checkpoints

    # Receive from specific partition
    python setup_consumer.py receive --namespace mynamespace --eventhub myeventhub \
        --partition 0 --starting-position earliest

    # Send test events
    python setup_consumer.py send --namespace mynamespace --eventhub myeventhub \
        --message "Hello World" --count 10

Environment Variables:
    EVENT_HUB_FULLY_QUALIFIED_NAMESPACE: <namespace>.servicebus.windows.net
    EVENT_HUB_NAME: Event Hub name
    STORAGE_ACCOUNT_URL: https://<account>.blob.core.windows.net
    CHECKPOINT_CONTAINER: Checkpoint container name
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from typing import Optional

from azure.eventhub import EventData
from azure.eventhub.aio import EventHubConsumerClient, EventHubProducerClient
from azure.identity.aio import DefaultAzureCredential


async def get_eventhub_info(namespace: str, eventhub: str):
    """Display Event Hub information."""
    async with DefaultAzureCredential() as credential, EventHubProducerClient(
        fully_qualified_namespace=namespace,
        eventhub_name=eventhub,
        credential=credential,
    ) as producer:
        props = await producer.get_eventhub_properties()

        print(f"Event Hub: {props['name']}")
        print(f"Created: {props['created_at']}")
        print(
            f"Partitions: {len(props['partition_ids'])} ({', '.join(props['partition_ids'])})"
        )


async def get_partition_info(namespace: str, eventhub: str):
    """Display detailed partition information."""
    async with DefaultAzureCredential() as credential, EventHubProducerClient(
        fully_qualified_namespace=namespace,
        eventhub_name=eventhub,
        credential=credential,
    ) as producer:
        props = await producer.get_eventhub_properties()

        print(f"Event Hub: {props['name']}")
        print(f"Total Partitions: {len(props['partition_ids'])}")
        print("-" * 60)

        total_events = 0
        for partition_id in props["partition_ids"]:
            p_props = await producer.get_partition_properties(partition_id)

            begin_seq = p_props["beginning_sequence_number"]
            last_seq = p_props["last_enqueued_sequence_number"]
            event_count = last_seq - begin_seq + 1 if not p_props["is_empty"] else 0
            total_events += event_count

            print(f"\nPartition {partition_id}:")
            print(f"  Empty: {p_props['is_empty']}")
            print(f"  Sequence Range: {begin_seq} - {last_seq}")
            print(f"  Event Count (approx): {event_count}")
            print(f"  Last Offset: {p_props['last_enqueued_offset']}")
            print(f"  Last Enqueued: {p_props['last_enqueued_time_utc']}")

        print("-" * 60)
        print(f"Total Events (approx): {total_events}")


async def receive_events(
    namespace: str,
    eventhub: str,
    consumer_group: str = "$Default",
    partition_id: Optional[str] = None,
    starting_position: str = "latest",
    storage_account: Optional[str] = None,
    checkpoint_container: Optional[str] = None,
    max_events: int = 100,
    max_wait_time: float = 30.0,
):
    """Receive events from Event Hub."""
    credential = DefaultAzureCredential()
    checkpoint_store = None

    # Setup checkpoint store if provided
    if storage_account and checkpoint_container:
        from azure.eventhub.extensions.checkpointstoreblob.aio import (
            BlobCheckpointStore,
        )

        storage_url = f"https://{storage_account}.blob.core.windows.net"
        checkpoint_store = BlobCheckpointStore(
            blob_account_url=storage_url,
            container_name=checkpoint_container,
            credential=credential,
        )
        print(f"Using checkpoint store: {storage_url}/{checkpoint_container}")

    # Parse starting position
    if starting_position == "earliest":
        start_pos = "-1"
    elif starting_position == "latest":
        start_pos = "@latest"
    else:
        start_pos = starting_position

    if max_events <= 0 or not 0 < max_wait_time <= 3600:
        raise ValueError("max_events must be positive and max_wait_time must be in (0, 3600]")
    event_count = 0
    stop = asyncio.Event()

    async def on_event(partition_context, event):
        nonlocal event_count

        if stop.is_set():
            return
        if event:
            event_count += 1
            print(
                f"\n[Partition {partition_context.partition_id}] Event {event_count}:"
            )
            print(f"  Sequence: {event.sequence_number}")
            print(f"  Offset: {event.offset}")
            print(f"  Enqueued: {event.enqueued_time}")

            body = event.body_as_str()
            if len(body) > 200:
                body = body[:200] + "..."
            print(f"  Body: {body}")

            if event.properties:
                print(f"  Properties: {event.properties}")

            # Checkpoint if store available
            if checkpoint_store:
                await partition_context.update_checkpoint(event)

        if event_count >= max_events:
            stop.set()

    async def on_error(partition_context, error):
        if partition_context:
            print(f"Error in partition {partition_context.partition_id}: {error}")
        else:
            print(f"Error: {error}")

    consumer = EventHubConsumerClient(
        fully_qualified_namespace=namespace,
        eventhub_name=eventhub,
        consumer_group=consumer_group,
        credential=credential,
        checkpoint_store=checkpoint_store,
    )

    print(f"Receiving from Event Hub: {eventhub}")
    print(f"Consumer Group: {consumer_group}")
    print(f"Starting Position: {starting_position}")
    if partition_id:
        print(f"Partition: {partition_id}")
    print(f"Max Events: {max_events}")
    print("-" * 60)

    try:
        async with consumer:
            receive_args = dict(on_event=on_event, on_error=on_error,
                                starting_position=start_pos, max_wait_time=max_wait_time)
            if partition_id:
                receive_args["partition_id"] = partition_id
            receiver = asyncio.create_task(consumer.receive(**receive_args))
            stopper = asyncio.create_task(stop.wait())
            try:
                done, _ = await asyncio.wait({receiver, stopper}, timeout=max_wait_time,
                                             return_when=asyncio.FIRST_COMPLETED)
                if receiver in done:
                    await receiver # surface receive errors
                elif not done:
                    print("Bounded receive window ended")
            finally:
                receiver.cancel()
                stopper.cancel()
                await asyncio.gather(receiver, stopper, return_exceptions=True)
    finally:
        if checkpoint_store:
            await checkpoint_store.close()
        await credential.close()

    print(f"\n-" * 60)
    print(f"Total events received: {event_count}")


async def send_events(
    namespace: str,
    eventhub: str,
    message: str,
    count: int = 1,
    partition_key: Optional[str] = None,
    partition_id: Optional[str] = None,
):
    """Send test events to Event Hub."""
    async with DefaultAzureCredential() as credential, EventHubProducerClient(
        fully_qualified_namespace=namespace,
        eventhub_name=eventhub,
        credential=credential,
    ) as producer:
        # Create batch with optional partition targeting
        batch_kwargs = {}
        if partition_id:
            batch_kwargs["partition_id"] = partition_id
            print(f"Sending to partition: {partition_id}")
        elif partition_key:
            batch_kwargs["partition_key"] = partition_key
            print(f"Using partition key: {partition_key}")

        batch = await producer.create_batch(**batch_kwargs)

        for i in range(count):
            event_body = f"{message} #{i + 1}" if count > 1 else message
            event = EventData(event_body)
            event.properties = {
                "index": i,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            try:
                batch.add(event)
            except ValueError:
                # Batch full, send and create new
                await producer.send_batch(batch)
                batch = await producer.create_batch(**batch_kwargs)
                batch.add(event)

        # Send remaining
        if batch:
            await producer.send_batch(batch)

        print(f"Sent {count} event(s) to {eventhub}")


def main():
    parser = argparse.ArgumentParser(
        description="Azure Event Hubs consumer setup and monitoring",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Common arguments
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument(
        "--namespace",
        "-n",
        default=os.environ.get("EVENT_HUB_FULLY_QUALIFIED_NAMESPACE"),
        help="Event Hub namespace (e.g., mynamespace.servicebus.windows.net)",
    )
    common.add_argument(
        "--eventhub",
        "-e",
        default=os.environ.get("EVENT_HUB_NAME"),
        help="Event Hub name",
    )

    # Info command
    info_parser = subparsers.add_parser(
        "info", parents=[common], help="Show Event Hub info"
    )

    # Partitions command
    partitions_parser = subparsers.add_parser(
        "partitions", parents=[common], help="Show partition details"
    )

    # Receive command
    receive_parser = subparsers.add_parser(
        "receive", parents=[common], help="Receive events"
    )
    receive_parser.add_argument(
        "--consumer-group",
        "-g",
        default="$Default",
        help="Consumer group (default: $Default)",
    )
    receive_parser.add_argument(
        "--partition", "-p", help="Specific partition to receive from"
    )
    receive_parser.add_argument(
        "--starting-position",
        choices=["earliest", "latest"],
        default="latest",
        help="Starting position (default: latest)",
    )
    receive_parser.add_argument(
        "--storage-account",
        default=os.environ.get("STORAGE_ACCOUNT_URL", "")
        .replace("https://", "")
        .replace(".blob.core.windows.net", ""),
        help="Storage account for checkpointing",
    )
    receive_parser.add_argument(
        "--checkpoint-container",
        default=os.environ.get("CHECKPOINT_CONTAINER"),
        help="Container for checkpoints",
    )
    receive_parser.add_argument(
        "--max-events",
        type=int,
        default=100,
        help="Maximum events to receive (default: 100)",
    )
    receive_parser.add_argument(
        "--max-wait-time",
        type=float,
        default=30.0,
        help="Total bounded receive window in seconds (default: 30)",
    )

    # Send command
    send_parser = subparsers.add_parser(
        "send", parents=[common], help="Send test events"
    )
    send_parser.add_argument(
        "--message", "-m", default="Test event", help="Message to send"
    )
    send_parser.add_argument(
        "--count",
        "-c",
        type=int,
        default=1,
        help="Number of events to send (default: 1)",
    )
    send_parser.add_argument(
        "--partition-key", help="Partition key for consistent routing"
    )
    send_parser.add_argument("--partition-id", help="Specific partition ID to send to")

    args = parser.parse_args()

    # Validate common args
    if not args.command:
        parser.print_help()
        sys.exit(1)

    # Add .servicebus.windows.net if not present
    namespace = args.namespace
    if namespace and not namespace.endswith(".servicebus.windows.net"):
        namespace = f"{namespace}.servicebus.windows.net"

    if not namespace or not args.eventhub:
        print("Error: --namespace and --eventhub are required")
        sys.exit(1)

    # Run command
    try:
        if args.command == "info":
            asyncio.run(get_eventhub_info(namespace, args.eventhub))

        elif args.command == "partitions":
            asyncio.run(get_partition_info(namespace, args.eventhub))

        elif args.command == "receive":
            asyncio.run(
                receive_events(
                    namespace=namespace,
                    eventhub=args.eventhub,
                    consumer_group=args.consumer_group,
                    partition_id=args.partition,
                    starting_position=args.starting_position,
                    storage_account=args.storage_account
                    if args.storage_account
                    else None,
                    checkpoint_container=args.checkpoint_container,
                    max_events=args.max_events,
                    max_wait_time=args.max_wait_time,
                )
            )

        elif args.command == "send":
            asyncio.run(
                send_events(
                    namespace=namespace,
                    eventhub=args.eventhub,
                    message=args.message,
                    count=args.count,
                    partition_key=args.partition_key,
                    partition_id=args.partition_id,
                )
            )

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
