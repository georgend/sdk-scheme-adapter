/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2019 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       James Bush - james.bush@modusbox.com                             *
 **************************************************************************/

'use strict';


const util = require('util');
const { AccountsModel, OutboundTransfersModel } = require('@internal/model');


/**
 * Common error handling logic
 */
const handleError = async (err, ctx) => {
    ctx.state.logger.log(`Error handling postTransfers: ${util.inspect(err)}`);
    ctx.response.status = err.httpStatusCode || 500;
    ctx.response.body = {
        message: err.message || 'Unspecified error',
        transferState: err.transferState || {},
        statusCode: err.httpStatusCode || 500
    };
    if(err.transferState
        && err.transferState.lastError
        && err.transferState.lastError.mojaloopError
        && err.transferState.lastError.mojaloopError.errorInformation
        && err.transferState.lastError.mojaloopError.errorInformation.errorCode) {

        ctx.response.body.statusCode = err.transferState.lastError.mojaloopError.errorInformation.errorCode;
    }
};


/**
 * Handler for outbound transfer request initiation
 */
const postTransfers = async (ctx) => {
    try {
        // this requires a multi-stage sequence with the switch.
        let transferRequest = {
            ...ctx.request.body
        };

        // use the transfers model to execute asynchronous stages with the switch
        const model = new OutboundTransfersModel({
            cache: ctx.state.cache,
            logger: ctx.state.logger,
            ...ctx.state.conf
        });

        // initialize the transfer model and start it running
        await model.initialize(transferRequest);
        const response = await model.run();

        // return the result
        ctx.response.status = 200;
        ctx.response.body = response;
    }
    catch(err) {
        return handleError(err, ctx);
    }
};



/**
 * Handler for resuming outbound transfers in scenarios where two-step transfers are enabled
 * by disabling the autoAcceptQuote SDK option
 */
const putTransfers = async (ctx) => {
    try {
        // this requires a multi-stage sequence with the switch.
        // use the transfers model to execute asynchronous stages with the switch
        const model = new OutboundTransfersModel({
            cache: ctx.state.cache,
            logger: ctx.state.logger,
            ...ctx.state.conf
        });

        // TODO: check the incoming body to reject party or quote when requested to do so

        // load the transfer model from cache and start it running again
        await model.load(ctx.state.path.params.transferId);

        const response = await model.run();

        // return the result
        ctx.response.status = 200;
        ctx.response.body = response;
    }
    catch(err) {
        return handleError(err, ctx);
    }
};


/**
 * Handler for outbound participants request initiation
 */
const postAccounts = async (ctx) => {
    try {
        const model = new AccountsModel({
            cache: ctx.state.cache,
            logger: ctx.state.logger,
            ...ctx.state.conf
        });

        const state = {
            accounts: ctx.request.body,
        };

        // initialize the accounts model and run it
        await model.initialize(state);
        const response = await model.run();

        // return the result
        ctx.response.status = 200;
        ctx.response.body = response;
    }
    catch(err) {
        return handleError(err, ctx);
    }
};


const healthCheck = async (ctx) => {
    ctx.response.status = 200;
    ctx.response.body = '';
};

module.exports = {
    map: {
        '/': {
            get: healthCheck
        },
        '/transfers': {
            post: postTransfers
        },
        '/transfers/{transferId}': {
            put: putTransfers
        },
        '/accounts': {
            post: postAccounts
        },
    }
};
