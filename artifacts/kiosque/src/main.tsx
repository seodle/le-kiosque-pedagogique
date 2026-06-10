import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken } from "./lib/auth";

setBaseUrl(null);
setAuthTokenGetter(() => getToken());

createRoot(document.getElementById("root")!).render(<App />);
