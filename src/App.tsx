import { MobileRuntime } from "./mobile";
import Prototype from "./Prototype";

export default function App() {
  const devicePreview = new URLSearchParams(window.location.search).get("preview") === "device";

  if (!devicePreview) {
    return <Prototype mode="website" />;
  }

  return (
    <MobileRuntime>
      <Prototype mode="device" />
    </MobileRuntime>
  );
}
