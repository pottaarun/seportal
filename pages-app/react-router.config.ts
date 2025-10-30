import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  async prerender() {
    return []; // Dynamic routes only
  },
} satisfies Config;
