import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MenuCategoryProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function MenuCategory({
  categories,
  activeCategory,
  onCategoryChange
}: MenuCategoryProps) {
  return (
    <div className="bg-white rounded-lg shadow-md mb-6 overflow-x-auto">
      <Tabs value={activeCategory} onValueChange={onCategoryChange}>
        <TabsList className="flex p-1 border-b border-gray-200">
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="px-4 py-2 font-medium rounded-md"
            >
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
