import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "../api";

type Props = { children: ReactNode };
type State = { error: Error | null };

// Catches a failed request from any section below it and offers a retry instead of a blank page.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  retry = () => {
    api.clear();
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Card className="items-start gap-3 px-5 py-5 md:px-6">
        <p className="font-semibold">Could not load the data</p>
        <p className="text-sm text-muted-foreground">{this.state.error.message}. The API may be waking up, so try again in a moment.</p>
        <Button variant="outline" size="sm" onClick={this.retry}>
          Try again
        </Button>
      </Card>
    );
  }
}
