import React from 'react';
import { cn } from '@/lib/utils';

interface LoopComponentProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Template for Loop React components
 * Follows Loop's component structure and patterns
 */
export const LoopComponent: React.FC<LoopComponentProps> = ({
  className,
  children
}) => {
  return (
    <div className={cn("loop-component", className)}>
      {children}
    </div>
  );
};

export default LoopComponent;

// Usage example:
// import { LoopComponent } from '@/components/ui/LoopComponent';
// 
// function MyFeature() {
//   return (
//     <LoopComponent className="p-4 bg-background">
//       <h1>My Feature</h1>
//     </LoopComponent>
//   );
// }