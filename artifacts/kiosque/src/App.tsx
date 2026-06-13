import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Connexion from "@/pages/connexion";
import Reconnexion from "@/pages/reconnexion";
import NouveauTicket from "@/pages/nouveau-ticket";
import Credentials from "@/pages/credentials";
import MonTicket from "@/pages/mon-ticket";
import F2 from "@/pages/f2";
import F2Ticket from "@/pages/f2-ticket";
import F1 from "@/pages/f1";
import F1Ticket from "@/pages/f1-ticket";
import TableauRd from "@/pages/tableau-rd";
import TableauPg from "@/pages/tableau-pg";
import TableauAdmin from "@/pages/tableau-admin";
import Admin from "@/pages/admin";
import AdminConnexion from "@/pages/admin-connexion";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/connexion" component={Connexion} />
      <Route path="/reconnexion" component={Reconnexion} />
      <Route path="/nouveau-ticket" component={NouveauTicket} />
      <Route path="/credentials" component={Credentials} />
      <Route path="/mon-ticket" component={MonTicket} />
      <Route path="/f2" component={F2} />
      <Route path="/f2/ticket/:id" component={F2Ticket} />
      <Route path="/f1" component={F1} />
      <Route path="/f1/ticket/:id" component={F1Ticket} />
      <Route path="/tableau-rd" component={TableauRd} />
      <Route path="/tableau-pg" component={TableauPg} />
      <Route path="/tableau-admin" component={TableauAdmin} />
      <Route path="/admin/connexion" component={AdminConnexion} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
