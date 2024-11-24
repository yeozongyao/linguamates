import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { UserProvider, useUser } from "./components/UserContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Practice from "./pages/Practice";
import Progress from "./pages/Progress";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import StudentDashboard from "./components/StudentDashboard";
import TutorDashboard from "./components/TutorDashboard";
import CombinedDashboard from "./components/CombinedDashboard";
import TutorList from "./components/TutorList";
import Profile from "./pages/Profile";
import FloatingChatIcon from "./components/FloatingChatIcon";
import TutorAvailability from "./pages/TutorAvailability";
import SessionBooking from "./pages/SessionBooking";
import ScheduleManagement from "./pages/ScheduleManagement";
import Evaluation from "./pages/Evaluation"
import Goals from "./pages/Goals";


const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useUser();

  return (
      <Router>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />

              {/* Protected routes for all authenticated users */}
              <Route
                path="/practice"
                element={
                  <ProtectedRoute>
                    <Practice />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/progress"
                element={
                  <ProtectedRoute>
                    <Progress />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    {user?.role === "student" ? (
                      <StudentDashboard />
                    ) : user?.role === "tutor" ? (
                      <TutorDashboard />
                    ) : (
                      <CombinedDashboard />
                    )}
                  </ProtectedRoute>
                }
              />

              {/* Student-specific routes */}
              <Route
                path="/find-tutor"
                element={
                  <ProtectedRoute allowedRoles={["student", "both"]}>
                    <TutorList />
                  </ProtectedRoute>
                }
              />

              {/* Tutor-specific routes */}
              <Route
                path="/availability"
                element={
                  <ProtectedRoute allowedRoles={["tutor", "both"]}>
                    <TutorAvailability />
                  </ProtectedRoute>
                }
              />

              {/* Routes for both roles */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/book/:tutorId"
                element={
                  <ProtectedRoute allowedRoles={["student", "both"]}>
                    <SessionBooking />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/schedule"
                element={
                  <ProtectedRoute>
                    <ScheduleManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/evaluation"
                element={
                  <ProtectedRoute>
                    <Evaluation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/goals"
                element={
                  <ProtectedRoute>
                    <Goals />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
          {user && <FloatingChatIcon />}
        </div>
      </Router>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </QueryClientProvider>
  );
};

export default App;
