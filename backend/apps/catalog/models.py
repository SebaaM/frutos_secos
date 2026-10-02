from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q


class Category(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=160)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    ingredients = models.TextField(blank=True)
    allergen_info = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    is_published = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=64, unique=True)
    weight_grams = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    stock_physical = models.PositiveIntegerField(default=0)
    stock_reserved = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["weight_grams"]
        constraints = [
            models.CheckConstraint(
                condition=Q(stock_reserved__lte=F("stock_physical")),
                name="variant_reserved_not_gt_physical",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.product.name} · {self.weight_grams} g"

    @property
    def stock_available(self) -> int:
        return self.stock_physical - self.stock_reserved

    @property
    def availability(self) -> str:
        if not self.is_active or self.stock_available <= 0:
            return "out_of_stock"
        if self.stock_available <= 5:
            return "low_stock"
        return "in_stock"


class ProductImage(models.Model):
    """An ordered gallery image. The first image is the product cover by convention."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image_url = models.URLField()
    alt_text = models.CharField(max_length=255)
    credit = models.CharField(max_length=160, blank=True)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "position"],
                name="product_image_unique_position",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.product.name} · imagen {self.position + 1}"
