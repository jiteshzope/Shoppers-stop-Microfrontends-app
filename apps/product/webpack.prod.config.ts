import { Configuration, DefinePlugin } from 'webpack';
import { withModuleFederation } from '@nx/module-federation/angular';
import config from './module-federation.config';

/**
 * DTS Plugin is disabled in Nx Workspaces as Nx already provides Typing support for Module Federation
 * The DTS Plugin can be enabled by setting dts: true
 * Learn more about the DTS Plugin here: https://module-federation.io/configure/dts.html
 */
export default withModuleFederation(
  {
    ...config,
    /*
     * Remote overrides for production.
     * Each entry is a pair of a unique name and the URL where it is deployed.
     *
     * e.g.
     * remotes: [
     *   ['app1', 'https://app1.example.com'],
     *   ['app2', 'https://app2.example.com'],
     * ]
     */
  },
  { dts: false },
).then((configFn) => (webpackConfig: Configuration) => {
  const updatedConfig = configFn(webpackConfig);
  updatedConfig.plugins.push(
    new DefinePlugin({
      // Baked into the bundle at build time so Vercel's env vars reach the browser.
      'process.env.NX_PUBLIC_API_BASE_URL': JSON.stringify(process.env['NX_PUBLIC_API_BASE_URL'] ?? ''),
    }),
  );
  return updatedConfig;
});
