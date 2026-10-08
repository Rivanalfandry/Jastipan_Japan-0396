import { Route, Switch } from "wouter";
import Index from "./pages/index";
import Login from "./pages/login";
import Settings from "./pages/settings";
import InvoicePage from "./pages/invoice";
import { Provider } from "./components/provider";
import { ProtectedRoute } from "./components/protected-route";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/settings">
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        </Route>
        <Route path="/invoice/:id">
          <ProtectedRoute>
            <InvoicePage />
          </ProtectedRoute>
        </Route>
        <Route path="/">
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        </Route>
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
