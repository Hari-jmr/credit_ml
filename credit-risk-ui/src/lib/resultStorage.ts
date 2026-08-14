// The result page is a separate route, so the predicted result has to cross a full navigation.
// sessionStorage (not localStorage) is deliberate: it's scoped to this tab and clears when the
// tab closes, which fits a one-off prediction better than a value that would otherwise persist
// indefinitely. This is a real browser running the built app, not an inline artifact preview, so
// sessionStorage is available and appropriate here.
export const RESULT_STORAGE_KEY = "credit-risk:last-result";
export const APPLICATION_STORAGE_KEY = "credit-risk:last-application";
export const RETURN_URL_KEY = "credit-risk:return-url";
