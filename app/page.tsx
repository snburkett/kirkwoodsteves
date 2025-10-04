import FieldMemoSlideOut from "@/components/FieldMemoSlideOut";
import HeaderTitle from "./(components)/HeaderTitle";
import QuadrantWheelNav from "./(components)/QuadrantWheelNav";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="-mt-[40px] mb-6 md:mt-0 md:mb-8">
        <HeaderTitle />
      </div>
      <div className="-mt-[24px] md:mt-0">
        <QuadrantWheelNav />
      </div>
      <FieldMemoSlideOut />
    </main>
  );
}
