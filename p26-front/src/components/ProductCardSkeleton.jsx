import Skeleton from "./Skeleton";

function ProductCardSkeleton() {
  return (
    <div className="product-card">
      <Skeleton height="140px" />
      <Skeleton height="16px" width="80%" />
      <Skeleton height="16px" width="40%" />
    </div>
  );
}

export default ProductCardSkeleton;