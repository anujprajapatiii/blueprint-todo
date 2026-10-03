import { createRoot } from "react-dom/client";
import "normalize.css/normalize.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import "@blueprintjs/datetime/lib/css/blueprint-datetime.css";
import "./styles.css";
import App from "./App";
createRoot(document.getElementById("root")!).render(<App />);
