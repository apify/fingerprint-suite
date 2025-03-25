import { FingerprintGenerator } from 'fingerprint-generator';
import { FingerprintInjector } from 'fingerprint-injector';

import { VanillaPlaywright } from './vanilla-playwright';

export class FingerprintSuite extends VanillaPlaywright {
    override getContext: VanillaPlaywright['getContext'] = async (options) => {
        const fingerprint = new FingerprintGenerator().getFingerprint({
            devices: ['desktop', 'mobile'],
            browsers: ['chrome'],
            operatingSystems: ['linux'],
        });

        const context = await super.getContext({
            ...options,
            contextOptions: {
                ...options.contextOptions,
                userAgent: fingerprint.fingerprint.navigator.userAgent,
                viewport: fingerprint.fingerprint.screen,
                locale: fingerprint.fingerprint.navigator.language,
            },
        });

        await new FingerprintInjector().attachFingerprintToPlaywright(
            context,
            fingerprint,
        );

        return context;
    };

    override getEngineName(): string {
        return 'fingerprint-suite';
    }
}
