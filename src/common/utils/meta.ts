import { UAParser } from "ua-parser-js";

export const metaExtract = async (req: any) => {
  try {
    // 1- User Agents value
    const userAgent = req.headers["user-agent"];
    const val = new UAParser(userAgent).getResult();
    const deviceInfo = [val.browser.name, val.os.name]
      .filter(Boolean)
      .join(" on ");

    // Get IP Address
    const forwarded = req.headers["x-forwarded-for"];
    let ip = "";
    if (Array.isArray(forwarded)) {
      ip = forwarded[0] || "";
    } else if (typeof forwarded === "string") {
      ip = forwarded.split(",")[0] || "";
    }

    ip = ip || req.socket.remoteAddress || "unknown";

    const meta = { deviceInfo, ip };
    return meta;
  } catch (err: any) {
    throw new Error("Login Faild");
  }
};
