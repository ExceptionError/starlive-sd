export const proxyAssetManager = (
  target: spine.webgl.AssetManager
) => new Proxy(target, handler);

const handler: ProxyHandler<spine.webgl.AssetManager> = {
  get(target, name, receiver) {
    if (name === "downloadText") {
      return (
        url: unknown,
        success: (data: string) => void,
        error: unknown
      ) => {
        const s = (data: string): void => {
          success(data.replace(".pvr", ".png"));
        };
        Reflect.apply(target["downloadText"], target, [url, s, error]);
      };
    } else {
      return Reflect.get(target, name, receiver);
    }
  },
};
