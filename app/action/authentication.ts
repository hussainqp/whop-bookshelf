import { headers } from "next/headers";
import { cache } from "react";
import { whopsdk } from "@/lib/whop-sdk";

export const verifyUser = cache(async (companyId: string, requiredAccessLevel?: "admin") => {
	const headersList = await headers();
	
	const { userId } = await whopsdk.verifyUserToken(headersList);
	
	const { access_level } = await whopsdk.users.checkAccess(companyId, { id: userId });

	if (requiredAccessLevel && access_level !== requiredAccessLevel) {
		throw new Error("User must be an admin to access this company");
	}

	if(access_level === "no_access") {
		throw new Error("User does not have access to this company");
	}
	 
	return {userId, accessLevel: access_level};
	 
});