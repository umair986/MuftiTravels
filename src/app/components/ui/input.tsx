import React from "react";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input(props, ref) {
  return (
    <input
      ref={ref}
      className="w-full border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      {...props}
    />
  );
});
