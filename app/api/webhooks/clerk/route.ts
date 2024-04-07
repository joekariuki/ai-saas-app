import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";
import { clerkClient } from "@clerk/nextjs";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Check if there are headers -> throw eror
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", { status: 400 });
  }

  // Get the body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  //   Create new svix instance with webhook
  const webhook = new Webhook(WEBHOOK_SECRET);

  let event: WebhookEvent;

  // Verfiy payload with headers
  try {
    event = webhook.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook:", error);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Get event ID and type
  const { id } = event.data;
  const eventType = event.type;

  // Create user webhook
  if (eventType === "user.created") {
    const { id, email_addresses, image_url, first_name, last_name, username } =
      event.data;

    const user = {
      clerkId: id,
      email: email_addresses[0].email_address,
      username: username!,
      firstName: first_name,
      lastName: last_name,
      photo: image_url,
    };

    const newUser = await createUser(user);

    // Set public metadata
    if (newUser) {
      await clerkClient.users.updateUserMetadata(id, {
        publicMetadata: {
          userId: newUser._id,
        },
      });
    }
    return NextResponse.json({ message: "OK", user: newUser });
  }

  // Update user webhook
  if (eventType === "user.updated") {
    const { id, image_url, first_name, last_name, username } = event.data;

    const user = {
      firstName: first_name,
      lastName: last_name,
      username: username!,
      photo: image_url,
    };

    const updatedUser = await updateUser(id, user);

    return NextResponse.json({ message: "OK", user: updatedUser });
  }

  // Delete user webhook
  if (eventType === "user.deleted") {
    const { id } = event.data;

    const deletedUser = await deleteUser(id!);

    return NextResponse.json({ message: "OK", user: deletedUser });
  }

  console.log(`Webhook with ID: ${id} and type of ${eventType}`);
  console.log("Webhook body:", body);
  return new Response("", { status: 200 });
}
