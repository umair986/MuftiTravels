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
      className={`rounded-xl bg-white p-4 ${className} ${
        withContent
          ? "shadow-md hover:shadow-lg transition-shadow duration-300"
          : ""
      }`}
    >
      {children}
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
