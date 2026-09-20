import {
  PageHeaderSkeleton,
  CardSkeleton,
} from "@/components/shared/skeletons";

export default function BusinessSettingsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withAction={false} />
      <CardSkeleton lines={2} />
      <CardSkeleton lines={4} />
    </div>
  );
}
