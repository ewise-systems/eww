const uniqid = require("uniqid");
const { BehaviorSubject } = require("rxjs");
const { toObservable } = require("../lib/frpcore/transforms");
const { requestToAegisWithToken } = require("../lib/hof/requestToAegis");
const { kickstart$: createPollingStream } = require("../lib/hos/pollingCore");

const HTTP_VERBS = {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE"
};

const PDV_PATHS = {
    GET_DETAILS: "/",
    RUN_BROWSER: "/public/browser",
    GET_INSTITUTIONS: (instCode = "") => `/ota/institutions/${instCode}`,
    START_OTA: "/ota/process",
    QUERY_OTA: (pid, csrf = "") => `/ota/process/${pid}?challenge=${csrf}`,
    RESUME_OTA: (pid = "") => `/ota/process/${pid}`,
    STOP_OTA: (pid, csrf = "") => `ota/process/${pid}?challenge=${csrf}`,
    ADD_PROFILE: "/profiles",
    GET_PROFILES: (pid = "", cred = false) => `/profiles/${pid}${cred ? "/credential" : ""}`,
    GET_PROCESS: (pid) => `/processes/${pid}`,
    RESUME_PROCESS: (pid) => `/processes/${pid}`,
    GET_ACCOUNTS: "/accounts",
    GET_TRANSACTIONS: "/transactions"
};

const TERMINAL_PDV_STATES = ["error", "partial", "stopped", "done"];
const stopStreamCondition = ({ status }) => TERMINAL_PDV_STATES.indexOf(status) === -1;

const aegis = (options = {}) => {
    const { jwt: defaultJwt } = options;

    return {
        getDetails: (jwt = defaultJwt) =>
            requestToAegisWithToken({
                method: HTTP_VERBS.GET,
                jwt: null,
                body: null,
                path: PDV_PATHS.GET_DETAILS,
                tokenOrUrl: jwt
            }),

        runBrowser: (jwt = defaultJwt) =>
            requestToAegisWithToken({
                method: HTTP_VERBS.GET,
                jwt: null,
                body: null,
                path: PDV_PATHS.RUN_BROWSER,
                tokenOrUrl: jwt
            }),

        getInstitutions: (instCode, jwt = defaultJwt) =>
            requestToAegisWithToken({
                method: HTTP_VERBS.GET,
                jwt,
                body: null,
                path: PDV_PATHS.GET_INSTITUTIONS(instCode),
                tokenOrUrl: jwt
            }),

        initializeOta: (instCode, prompts, jwt = defaultJwt) => {
            const subject$ = new BehaviorSubject({ value: null });

            const csrf = uniqid();
            const bodyCsrf = { code: instCode, prompts, challenge: csrf };

            const initialStream$ = toObservable(HTTP_VERBS.POST, jwt, bodyCsrf, PDV_PATHS.START_OTA);
            const pollingStream$ = pid => toObservable(HTTP_VERBS.GET, jwt, null, PDV_PATHS.QUERY_OTA(pid, csrf));
            const stream$ = createPollingStream(stopStreamCondition, initialStream$, pollingStream$);

            return {
                run: () =>
                    stream$.subscribe(subject$) && subject$,
                resume: otp =>
                    requestToAegisWithToken({
                        method: HTTP_VERBS.POST,
                        jwt,
                        body: { ...otp, challenge: csrf },
                        path: PDV_PATHS.RESUME_OTA(subject$.value.processId),
                        tokenOrUrl: jwt
                    }),
                stop: () =>
                    requestToAegisWithToken({
                        method: HTTP_VERBS.DELETE,
                        jwt,
                        body: null,
                        path: PDV_PATHS.STOP_OTA(subject$.value.processId, csrf),
                        tokenOrUrl: jwt
                    })
            };
        },

        addProfile: (instCode, prompts, jwt = defaultJwt) => {
            const subject$ = new BehaviorSubject({ value: null });

            const body = { code: instCode, prompts: prompts };

            const initialStream$ = toObservable(HTTP_VERBS.POST, jwt, body, PDV_PATHS.ADD_PROFILE);
            const pollingStream$ = pid => toObservable(HTTP_VERBS.GET, jwt, null, PDV_PATHS.GET_PROCESS(pid));
            const stream$ = createPollingStream(stopStreamCondition, initialStream$, pollingStream$);

            return {
                run: () =>
                    stream$.subscribe(subject$) && subject$,
                resume: prompts =>
                    requestToAegisWithToken({
                        method: HTTP_VERBS.POST,
                        jwt,
                        body: { code: instCode, ...prompts },
                        path: PDV_PATHS.RESUME_PROCESS(subject$.value.processId),
                        tokenOrUrl: jwt
                    })
            };
        },

        getProfiles: (pid = "", cred = false, jwt = defaultJwt) =>
            requestToAegisWithToken({
                method: HTTP_VERBS.GET,
                jwt,
                body: null,
                path: PDV_PATHS.GET_PROFILES(pid, cred),
                tokenOrUrl: jwt
            }),
        
        getAccounts: (jwt = defaultJwt) =>
            requestToAegisWithToken({
                method: HTTP_VERBS.GET,
                jwt,
                body: null,
                path: PDV_PATHS.GET_ACCOUNTS,
                tokenOrUrl: jwt
            }),
        
        getTransactions: (jwt = defaultJwt) =>
            requestToAegisWithToken({
                method: HTTP_VERBS.GET,
                jwt,
                body: null,
                path: PDV_PATHS.GET_TRANSACTIONS,
                tokenOrUrl: jwt
            })
    };
};

module.exports = (options) =>
    Object.freeze(aegis(options));