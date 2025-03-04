import * as React from "react"
import { cn } from "@/lib/utils"

type PrivacyAttributeProps = {
  type?: string;
  name?: string;
  id?: string;
};

// Check if an input field might collect PII
const isPotentiallyPII = (props: PrivacyAttributeProps): boolean => {
  const sensitiveTerms = [
    'email', 
    'name', 
    'phone', 
    'address', 
    'mac', 
    'serial', 
    'user', 
    'password',
    'location',
    'ip'
  ];
  
  // Check name, id and other attributes for sensitive terms
  const attributes = [props.name, props.id, props.type];
  
  return attributes.some(attr => 
    attr && sensitiveTerms.some(term => 
      attr.toLowerCase().includes(term.toLowerCase())
    )
  );
};

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // If the input might collect PII, we modify its behavior
    if (isPotentiallyPII(props)) {
      // For password fields, keep functionality but don't store 
      if (type === 'password') {
        return (
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              className
            )}
            ref={ref}
            autoComplete="off"
            {...props}
            // Don't save in browser history/autofill
            autoSave="off"
          />
        )
      }
      
      // For other PII fields, replace with a generic input that doesn't store data
      return (
        <input
          type="text"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          ref={ref}
          {...props}
          // Prevent browser from saving this data
          autoComplete="off"
          autoSave="off"
          // Set a data attribute for styling
          data-privacy-sensitive="true"
        />
      )
    }
    
    // Regular inputs remain unchanged
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
