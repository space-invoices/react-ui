import { Card, CardContent } from "@/ui/components/ui/card";

import "./index.css";

export function App() {
  return (
    <div className="container relative z-10 mx-auto p-8 text-center">
      <div className="mb-8 flex items-center justify-center gap-8">{/* Logo */}</div>

      <Card className="border-muted bg-card/50 backdrop-blur-sm">
        <CardContent>
          <h1 className="mb-4 font-bold text-5xl leading-tight">Space Invoices React UI kit</h1>

          <p>
            This is a simple UI kit for React. It is a work in progress and will be updated as we add more components.
          </p>

          {/* Place components here for preview */}
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
