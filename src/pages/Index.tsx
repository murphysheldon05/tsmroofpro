import { Navigate } from "react-router-dom";

const Index = () => {
  // Redirect to auth page - matches the route configuration in App.tsx
  return <Navigate to="/auth" replace />;
};

export default Index;
