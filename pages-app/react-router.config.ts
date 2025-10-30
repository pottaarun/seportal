import type { Config } from "@react-router/dev/config";
import { cloudflareDevProxyVitePlugin as remixCloudflareDevProxy } from "@react-router/cloudflare";

export default {
  ssr: false,
} satisfies Config;
