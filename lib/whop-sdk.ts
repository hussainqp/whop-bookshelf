import { Whop } from "@whop/sdk";

export const whopsdk = new Whop({
	appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
	apiKey: process.env.WHOP_API_KEY,
	webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET || ""),
});

export const whopsdkApp = new Whop({
	appID: process.env.NEXT_PUBLIC_WHOP_APP_ID_APP,
	apiKey: process.env.WHOP_API_KEY_APP,
	webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET_APP || ""),
});
