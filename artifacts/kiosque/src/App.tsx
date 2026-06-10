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
import N1 from "@/pages/n1";
import N1Ticket from "@/pages/n1-ticket";
import N2 from "@/pages/n2";
import N2Ticket from "@/pages/n2-ticket";
import TableauRd from "@/pages/tableau-rd";
import TableauPg from "@/pages/tableau-pg";
import Admin from "@/pages/admin";

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
      <Route path="/n1" component={N1} />
      <Route path="/n1/ticket/:id" component={N1Ticket} />
      <Route path="/n2" component={N2} />
      <Route path="/n2/ticket/:id" component={N2Ticket} />
      <Route path="/tableau-rd" component={TableauRd} />
      <Route path="/tableau-pg" component={TableauPg} />
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
