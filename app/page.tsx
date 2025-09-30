import FieldMemoSlideOut from "@/components/FieldMemoSlideOut";
import HeaderTitle from "./(components)/HeaderTitle";
import QuadrantWheelNav from "./(components)/QuadrantWheelNav";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16">
      <HeaderTitle />
      <QuadrantWheelNav />
      <FieldMemoSlideOut />
    </main>
  );
}
