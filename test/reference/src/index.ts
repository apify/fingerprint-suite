import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { FingerprintInjector } from 'fingerprint-injector';
import { 
  FingerprintGenerator,
} from 'fingerprint-generator';
import type { 
  FingerprintGeneratorOptions, 
  BrowserFingerprintWithHeaders,
  Fingerprint
} from 'fingerprint-generator';

import type { 
  BrowserName,
  Device,
  OperatingSystem as OS
} from 'header-generator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
    try {
        const app = express();

        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom',
            root: resolve(__dirname, '../static'),
        });

        app.use(vite.middlewares);

        app.set('view engine', 'ejs');
        app.set('views', resolve(__dirname, '../static'));

        app.get('/', (req, res) => {
            
            const browser = req.query.browser as string || 'chrome';
            const device = req.query.device as string || 'desktop';
            const os = req.query.os as string || 'windows';
            
            const validBrowsers: BrowserName[] = ['chrome', 'firefox', 'safari', 'edge'];
            const validDevices: Device[] = ['desktop', 'mobile'];
            const validOS: OS[] = ['windows', 'macos', 'linux', 'android', 'ios'];
            
            const selectedBrowser = validBrowsers.includes(browser as BrowserName) ? browser as BrowserName : 'chrome';
            const selectedDevice = validDevices.includes(device as Device) ? device as Device : 'desktop';
            const selectedOS = validOS.includes(os as OS) ? os as OS : 'windows';
            
            const fingerprintInjector = new FingerprintInjector();
            
            const options: Partial<FingerprintGeneratorOptions> = {
                browsers: [selectedBrowser],
                devices: [selectedDevice],
                operatingSystems: [selectedOS],
            };
            
            const generatorResult: BrowserFingerprintWithHeaders = new FingerprintGenerator().getFingerprint(options);
            
            const fingerprint: Fingerprint = generatorResult.fingerprint;
            
            res.render('layout', {
                inject: fingerprintInjector.getInjectableScript(generatorResult),
                fingerprint: JSON.stringify(fingerprint, null, 2),
                browser: selectedBrowser,
                device: selectedDevice,
                os: selectedOS
            });
        });

        const port = 3000;
        app.listen(port, () => {
            console.log(`Server started at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Server initialization error:', error);
        process.exit(1);
    }
}

startServer().catch((error) => {
    console.error('Unhandled server error:', error);
    process.exit(1);
});
