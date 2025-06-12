import React from "react";

const Card = ({
  children,
  className = "",
  withContent = false,
}: {
  children: React.ReactNode;
  className?: string;
  withContent?: boolean;
}) => {
  return (
    <div
      className={`relative group rounded-xl bg-white p-4 overflow-hidden ${className} ${
        withContent
          ? "shadow-md hover:shadow-lg transition-shadow duration-300"
          : ""
      }`}
    >
      {/* Hover Effect Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#f8ac0d] to-[#092638] opacity-0 group-hover:opacity-100 transition duration-500 blur-md scale-105 z-0"></div>
      <div className="relative z-10">{children}</div>
    </div>
  );
};

const CardContent = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={`p-4 ${className}`}>{children}</div>;
};

export { Card, CardContent };
