import express from "express";
import {
    FronteggContext, IdentityClient, EntitlementsClient
} from '@frontegg/client';

const app = express();

FronteggContext.init({
    FRONTEGG_CLIENT_ID: process.env.FRONTEGG_CLIENT_ID || '',
    FRONTEGG_API_KEY: process.env.FRONTEGG_API_KEY || ''
});

process.on('unhandledRejection', reason => {
    console.error(reason);
});

(async () => {
    try {
        const client = await EntitlementsClient.init();
        console.log('Entitlements client started.');

        client.on('snapshot-updated', (offset: number) => {
            console.log('Snapshot updated with offset: ', offset);
        })

        await client.ready().then(() => {
            console.log('Entitlements initialized.')
        });

        const identity = IdentityClient.getInstance()

        app.use(express.json());
        app.post('/my-token-info', async (req, res) => {
            const body = req.body;

            const entity = await identity.validateToken(body.token);

            res.send(entity);
        });

        app.get('/entitled-to-featute/:feature', async (req, res) => {
            const token = req.header('Authorization')?.split(' ')[1];
            const featureKey = req.param('feature', '');

            const entity = await identity.validateToken(token!, { withRolesAndPermissions: true });
            const entitlement = client.forUser(entity);

            res.send({
                isEntitledToFeature: {
                    featureKey,
                    result: await entitlement.isEntitledTo({ featureKey })
                }
            })
        });

        app.get('/entitled-to-permission/:permission', async (req, res) => {
            const token = req.header('Authorization')?.split(' ')[1];
            const permissionKey = req.param('permission', '');

            const entity = await identity.validateToken(token!, { withRolesAndPermissions: true });
            const entitlement = client.forUser(entity);

            res.send({
                isEntitledToPermission: {
                    permissionKey,
                    result: await entitlement.isEntitledTo({ permissionKey })
                }
            })
        });

        app.listen(process.env.PORT, () => {
            console.log('test server started');
        });
    } catch (e) {
        console.error(e);
    }

})()



