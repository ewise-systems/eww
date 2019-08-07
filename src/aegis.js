const uniqid = require("uniqid");
const { not } = require("ramda");
const { isNotNil } = require("@ewise/aegisjs-core/fpcore/pointfree");
const { addDelay } = require("@ewise/aegisjs-core/frpcore/pointfree");
const { requestToAegisWithToken } = require("@ewise/aegisjs-core/hof/requestToAegis");
const PDV_PATHS = require("@ewise/aegisjs-core/constants/pdvPaths");
const {
    createRecursivePDVPollStream,
    createRecursiveDownloadPollStream,
    createTaskFromIntervalRetryPollStream,
    createTaskFromIntervalPollStream
} = require("@ewise/aegisjs-core");
const {
    DEFAULT_REQUEST_TIMEOUT,
    FIVE_SECOND_REQUEST_TIMEOUT,
    ONE_SECOND_REQUEST_TIMEOUT,
    DEFAULT_RETY_LIMIT,
    DEFAULT_DELAY_BEFORE_RETRY,
    RAPID_DELAY_BEFORE_RETRY,
    DEFAULT_POLLING_INTERVAL,
    DEFAULT_AGGREGATE_WITH_TRANSACTIONS,
    POSITIVE_INFINITY
} = require("@ewise/aegisjs-core/constants");

const HTTP_VERBS = {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE"
};

const aegis = (options = {}) => {
    const {
        jwt: defaultJwt,
        timeout: defaultTimeout = DEFAULT_REQUEST_TIMEOUT,
        retryLimit: defaultRetryLimit = DEFAULT_RETY_LIMIT,
        retryDelay: defaultRetryDelay = DEFAULT_DELAY_BEFORE_RETRY,
        ajaxTaskFn: defaultAjaxTaskFn = requestToAegisWithToken
    } = options;

    return {
        getDetails: (args = {}) => {
            const {
                jwtOrUrl = defaultJwt,
                timeout = defaultTimeout,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return ajaxTaskFn(
                HTTP_VERBS.GET,
                null,
                null,
                timeout,
                PDV_PATHS.GET_DETAILS,
                jwtOrUrl
            );
        },

        hasStarted: (args = {}) => {
            const {
                jwtOrUrl = defaultJwt,
                pollingInterval: pollInterval = DEFAULT_POLLING_INTERVAL,
                timeout = ONE_SECOND_REQUEST_TIMEOUT,
                retryLimit = POSITIVE_INFINITY,
                retryDelay = RAPID_DELAY_BEFORE_RETRY,
                pollWhile: pred = not,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return createTaskFromIntervalRetryPollStream(
                pollInterval,
                retryLimit,
                retryDelay,
                pred,
                () => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    null,
                    null,
                    timeout,
                    PDV_PATHS.GET_DETAILS,
                    jwtOrUrl
                )
            );
        },

        hasStopped: (args = {}) => {
            const {
                jwtOrUrl = defaultJwt,
                pollingInterval: pollInterval = DEFAULT_POLLING_INTERVAL,
                timeout = ONE_SECOND_REQUEST_TIMEOUT,
                pollWhile: pred = isNotNil,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return createTaskFromIntervalPollStream(
                pollInterval,
                pred,
                () => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    null,
                    null,
                    timeout,
                    PDV_PATHS.GET_DETAILS,
                    jwtOrUrl
                )
            );
        },
        
        checkForUpdates: (args = {}) => {
            const {
                updateSite,
                jwtOrUrl = defaultJwt,
                timeout = defaultTimeout,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return ajaxTaskFn(
                HTTP_VERBS.GET,
                null,
                null,
                timeout,
                PDV_PATHS.CHECK_FOR_UPDATES(updateSite),
                jwtOrUrl
            );
        },

        waitForUpdates: (args = {}) => {
            const {
                updateSite,
                jwtOrUrl = defaultJwt,
                pollingInterval: pollInterval = DEFAULT_POLLING_INTERVAL,
                timeout = FIVE_SECOND_REQUEST_TIMEOUT,
                retryLimit = POSITIVE_INFINITY,
                retryDelay = RAPID_DELAY_BEFORE_RETRY,
                pollWhile: pred = not,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return createTaskFromIntervalRetryPollStream(
                pollInterval,
                retryLimit,
                retryDelay,
                pred,
                () => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    null,
                    null,
                    timeout,
                    PDV_PATHS.CHECK_FOR_UPDATES(updateSite),
                    jwtOrUrl
                )
            );
        },

        downloadUpdates: (args = {}) => {
            const {
                pollingInterval: pollInterval = DEFAULT_POLLING_INTERVAL,
                jwtOrUrl = defaultJwt,
                timeout = defaultTimeout,
                retryLimit = defaultRetryLimit,
                retryDelay = defaultRetryDelay,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return createRecursiveDownloadPollStream({
                retryLimit,
                retryDelay,
                start: () => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    null,
                    null,
                    timeout,
                    PDV_PATHS.DOWNLOAD_UPDATES,
                    jwtOrUrl
                ),
                afterCheck: addDelay(pollInterval),
                check: () => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    null,
                    null,
                    timeout,
                    PDV_PATHS.DOWNLOAD_UPDATE_PROCESS,
                    jwtOrUrl
                ),
                stop: pid => ajaxTaskFn(
                    HTTP_VERBS.DELETE,
                    null,
                    null,
                    timeout,
                    PDV_PATHS.STOP_PROCESS(pid)
                )
            });
        },

        applyUpdates: (args = {}) => {
            const {
                jwtOrUrl = defaultJwt,
                timeout = defaultTimeout,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return ajaxTaskFn(
                HTTP_VERBS.GET,
                null,
                null,
                timeout,
                PDV_PATHS.APPLY_UPDATES,
                jwtOrUrl
            ); 
        },

        runBrowser: (args = {}) => {
            const {
                jwtOrUrl = defaultJwt,
                timeout = defaultTimeout,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return ajaxTaskFn(
                HTTP_VERBS.GET,
                null,
                null,
                timeout,
                PDV_PATHS.RUN_BROWSER,
                jwtOrUrl
            );
        },
        
        getInstitutions: (args = {}) => {
            const {
                instCode,
                jwt = defaultJwt,
                timeout = defaultTimeout,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return ajaxTaskFn(
                HTTP_VERBS.GET,
                jwt,
                null,
                timeout,
                PDV_PATHS.GET_INSTITUTIONS(instCode)
            );
        },

        initializeOta: (args = {}) => {
            const {
                instCode,
                prompts,
                jwt = defaultJwt,
                timeout = defaultTimeout,
                retryLimit = defaultRetryLimit,
                retryDelay = defaultRetryDelay,
                withTransactions: transactions = DEFAULT_AGGREGATE_WITH_TRANSACTIONS,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;

            const csrf = uniqid();
            const bodyCsrf = { code: instCode, prompts, challenge: csrf, transactions };

            return createRecursivePDVPollStream({
                retryLimit,
                retryDelay,
                start: () => ajaxTaskFn(
                    HTTP_VERBS.POST,
                    jwt,
                    bodyCsrf,
                    timeout,
                    PDV_PATHS.START_OTA
                ),
                check: pid => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.QUERY_OTA(pid, csrf)
                ),
                resume: (getPid, otp) => ajaxTaskFn(
                    HTTP_VERBS.POST,
                    jwt,
                    { ...otp, challenge: csrf },
                    timeout,
                    PDV_PATHS.RESUME_OTA(getPid())
                ),
                stop: pid => ajaxTaskFn(
                    HTTP_VERBS.DELETE,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.STOP_OTA(pid, csrf)
                )
            });
        },

        addProfile: (args = {}) => {
            const {
                instCode,
                prompts,
                jwt = defaultJwt,
                timeout = defaultTimeout,
                retryLimit = defaultRetryLimit,
                retryDelay = defaultRetryDelay,
                withTransactions: transactions = DEFAULT_AGGREGATE_WITH_TRANSACTIONS,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;

            const body = { code: instCode, prompts, transactions };

            return createRecursivePDVPollStream({
                retryLimit,
                retryDelay,
                start: () => ajaxTaskFn(
                    HTTP_VERBS.POST,
                    jwt,
                    body,
                    timeout,
                    PDV_PATHS.ADD_PROFILE
                ),
                check: pid => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.GET_PROCESS(pid)
                ),
                resume: (getPid, prompts) => ajaxTaskFn(
                    HTTP_VERBS.POST,
                    jwt,
                    { ...prompts },
                    timeout,
                    PDV_PATHS.RESUME_PROCESS(getPid())
                ),
                stop: pid => ajaxTaskFn(
                    HTTP_VERBS.DELETE,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.STOP_PROCESS(pid)
                )
            });
        },

        addProfileAndLogin: (args = {}) => {
            const {
                instCode,
                prompts,
                jwt = defaultJwt,
                timeout = defaultTimeout,
                retryLimit = defaultRetryLimit,
                retryDelay = defaultRetryDelay,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;

            const body = { code: instCode, prompts };

            return createRecursivePDVPollStream({
                retryLimit,
                retryDelay,
                start: () => ajaxTaskFn(
                    HTTP_VERBS.POST,
                    jwt,
                    body,
                    timeout,
                    PDV_PATHS.LOGIN_AND_ADD_PROFILE
                ),
                check: pid => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.GET_PROCESS(pid)
                ),
                resume: (getPid, prompts) => ajaxTaskFn(
                    HTTP_VERBS.POST,
                    jwt,
                    { ...prompts },
                    timeout,
                    PDV_PATHS.RESUME_PROCESS(getPid())
                ),
                stop: pid => ajaxTaskFn(
                    HTTP_VERBS.DELETE,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.STOP_PROCESS(pid)
                )
            });
        },

        loginProfile: (args = {}) => {
            const {
                profileId,
                jwt = defaultJwt,
                timeout = defaultTimeout,
                retryLimit = defaultRetryLimit,
                retryDelay = defaultRetryDelay,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;

            return createRecursivePDVPollStream({
                retryLimit,
                retryDelay,
                start: () => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.LOGIN_PROFILE(profileId)
                ),
                check: pid => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.GET_PROCESS(pid)
                ),
                resume: (getPid, prompts) => ajaxTaskFn(
                    HTTP_VERBS.POST,
                    jwt,
                    { ...prompts },
                    timeout,
                    PDV_PATHS.RESUME_PROCESS(getPid())
                ),
                stop: pid => ajaxTaskFn(
                    HTTP_VERBS.DELETE,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.STOP_PROCESS(pid)
                )
            });
        },

        addBasicProfile: (args = {}) => {
            const {
                instCode,
                prompts,
                jwt = defaultJwt,
                timeout = defaultTimeout,
                retryLimit = defaultRetryLimit,
                retryDelay = defaultRetryDelay,
                withTransactions: transactions = DEFAULT_AGGREGATE_WITH_TRANSACTIONS,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;

            const body = { code: instCode, prompts, transactions };

            return createRecursivePDVPollStream({
                retryLimit,
                retryDelay,
                start: () => ajaxTaskFn(
                    HTTP_VERBS.POST,
                    jwt,
                    body,
                    timeout,
                    PDV_PATHS.ADD_BASIC_PROFILE
                ),
                check: pid => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.GET_PROCESS(pid)
                ),
                resume: (getPid, prompts) => ajaxTaskFn(
                    HTTP_VERBS.POST,
                    jwt,
                    { ...prompts },
                    timeout,
                    PDV_PATHS.RESUME_PROCESS(getPid())
                ),
                stop: pid => ajaxTaskFn(
                    HTTP_VERBS.DELETE,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.STOP_PROCESS(pid)
                )
            });
        },

        deleteProfile: (args = {}) => {
            const {
                jwt = defaultJwt,
                profileId,
                timeout = defaultTimeout,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return ajaxTaskFn(
                HTTP_VERBS.DELETE,
                jwt,
                null,
                timeout,
                PDV_PATHS.DELETE_PROFILE(profileId)
            );
        },

        getProfiles: (args = {}) => {
            const {
                profileId = "",
                cred = false,
                jwt = defaultJwt,
                timeout = defaultTimeout,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return ajaxTaskFn(
                HTTP_VERBS.GET,
                jwt,
                null,
                timeout,
                PDV_PATHS.GET_PROFILES(profileId, cred)
            );
        },

        updateProfile: (args = {}) => {
            const {
                profileId,
                instCode,
                prompts,
                jwt = defaultJwt,
                timeout = defaultTimeout,
                retryLimit = defaultRetryLimit,
                retryDelay = defaultRetryDelay,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;

            const body = instCode && prompts ?
                { code: instCode, prompts } :
                null;
            
            return createRecursivePDVPollStream({
                retryLimit,
                retryDelay,
                start: () => ajaxTaskFn(
                    HTTP_VERBS.PUT,
                    jwt,
                    body,
                    timeout,
                    PDV_PATHS.UPDATE_PROFILE(profileId)
                ),
                check: pid => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.GET_PROCESS(pid)
                ),
                resume: (getPid, prompts) => ajaxTaskFn(
                    HTTP_VERBS.POST,
                    jwt,
                    prompts,
                    timeout,
                    PDV_PATHS.RESUME_PROCESS(getPid())
                ),
                stop: pid => ajaxTaskFn(
                    HTTP_VERBS.DELETE,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.STOP_PROCESS(pid)
                )
            });
        },

        updateBasicProfile: (args = {}) => {
            const {
                profileId,
                instCode,
                prompts,
                jwt = defaultJwt,
                timeout = defaultTimeout,
                retryLimit = defaultRetryLimit,
                retryDelay = defaultRetryDelay,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;

            const body = instCode && prompts ?
                { code: instCode, prompts } :
                null;
            
            return createRecursivePDVPollStream({
                retryLimit,
                retryDelay,
                start: () => ajaxTaskFn(
                    HTTP_VERBS.PUT,
                    jwt,
                    body,
                    timeout,
                    PDV_PATHS.UPDATE_BASIC_PROFILE(profileId)
                ),
                check: pid => ajaxTaskFn(
                    HTTP_VERBS.GET,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.GET_PROCESS(pid)
                ),
                resume: (getPid, prompts) => ajaxTaskFn(
                    HTTP_VERBS.POST,
                    jwt,
                    prompts,
                    timeout,
                    PDV_PATHS.RESUME_PROCESS(getPid())
                ),
                stop: pid => ajaxTaskFn(
                    HTTP_VERBS.DELETE,
                    jwt,
                    null,
                    timeout,
                    PDV_PATHS.STOP_PROCESS(pid)
                )
            });
        },
        
        getAccounts: (args = {}) => {
            const {
                jwt = defaultJwt,
                accountId,
                profileId,
                accountType,
                timeout = defaultTimeout,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            const queryParams = [accountId, profileId, accountType];
            return ajaxTaskFn(
                HTTP_VERBS.GET,
                jwt,
                null,
                timeout,
                PDV_PATHS.GET_ACCOUNTS(...queryParams)
            );
        },

        deleteAccount: (args = {}) => {
            const {
                jwt = defaultJwt,
                accountId,
                timeout = defaultTimeout,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return ajaxTaskFn(
                HTTP_VERBS.DELETE,
                jwt,
                null,
                timeout,
                PDV_PATHS.GET_ACCOUNTS(accountId)
            );
        },
        
        getTransactions: (args = {}) => {
            const {
                jwt = defaultJwt,
                transactionId,
                startDate,
                endDate,
                profileId,
                accountId,
                timeout = defaultTimeout,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            const queryParams = [transactionId, startDate, endDate, profileId, accountId];
            return ajaxTaskFn(
                HTTP_VERBS.GET,
                jwt,
                null,
                timeout,
                PDV_PATHS.GET_TRANSACTIONS(...queryParams)
            );
        },

        deleteTransaction: (args = {}) => {
            const {
                jwt = defaultJwt,
                transactionId,
                timeout = defaultTimeout,
                ajaxTaskFn = defaultAjaxTaskFn
            } = args;
            return ajaxTaskFn(
                HTTP_VERBS.DELETE,
                jwt,
                null,
                timeout,
                PDV_PATHS.GET_TRANSACTIONS(transactionId)
            );
        }
    };
};

module.exports = (options) =>
    Object.freeze(aegis(options));