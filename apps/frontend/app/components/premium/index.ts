export { Button } from "./button";
export type { ButtonProps } from "./button";

export { 
  FormField, 
  FormLabel, 
  FormDescription, 
  FormError, 
  FormSuccess,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  RadioGroup,
  Switch,
  FormSection,
  FormActions
} from "./form";

export { Input, Textarea } from "./input";
export type { InputProps, TextareaProps } from "./input";

export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "./card";
export type { CardProps, CardHeaderProps, CardContentProps, CardFooterProps, CardTitleProps, CardDescriptionProps } from "./card";

export { Badge } from "./badge";
export type { BadgeProps } from "./badge";

export { DataTable, TableActions, Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from "./table";
export type { Column } from "./table";

export { Modal, ModalHeader, ModalContent, ModalFooter, ModalTitle, ModalDescription, ConfirmModal, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./modal";
export type { ModalProps, ModalHeaderProps, ModalContentProps, ModalFooterProps, ModalTitleProps, ModalDescriptionProps } from "./modal";

export { Drawer } from "./drawer";
export type { DrawerProps } from "./drawer";

export { Tabs, TabList, TabTrigger, TabContent } from "./tabs";
export type { TabsProps, TabTriggerProps, TabContentProps, TabPanelProps } from "./tabs";

export { Skeleton, SkeletonGroup, SkeletonCard, PageSkeleton, StatsSkeleton, ChartSkeleton, TableSkeleton, FormSkeleton, DashboardSkeleton } from "./skeleton";

export { EmptyState, LoadingState, ErrorState } from "./states";

export { AnimatedText, FadeIn, StaggerChildren, StaggerItem, ScaleOnHover, PulseGlow } from "./animations";

export { Alert, AlertBanner, Toast } from "./alert";

// Charts/recharts: import from "@/app/components/premium/chart" (keeps barrel from pulling recharts on every page).

export { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator } from "./navigation";
export type { BreadcrumbProps, BreadcrumbItemProps, BreadcrumbSeparatorProps } from "./navigation";

export { Pagination } from "./pagination";

export {
  ScrollReveal,
  ScrollRevealGroup,
  ParallaxSection,
  Counter,
  ScrollProgress,
  AnimateOnScroll,
  MagneticButton,
  StaggerReveal,
} from "./sections";
export type {
  ScrollRevealProps,
  ScrollRevealGroupProps,
  ParallaxSectionProps,
  CounterProps,
  ScrollProgressProps,
  AnimateOnScrollProps,
  MagneticButtonProps,
  StaggerRevealProps,
} from "./sections";