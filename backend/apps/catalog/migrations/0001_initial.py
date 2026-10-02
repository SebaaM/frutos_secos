# Generated manually to establish the first catalog schema.

from decimal import Decimal

import django.db.models.deletion
from django.core.validators import MinValueValidator
from django.db import migrations, models
import django.db.models.expressions


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=80)),
                ("slug", models.SlugField(unique=True)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"verbose_name_plural": "categories", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("slug", models.SlugField(unique=True)),
                ("description", models.TextField(blank=True)),
                ("ingredients", models.TextField(blank=True)),
                ("allergen_info", models.TextField(blank=True)),
                ("image_url", models.URLField(blank=True)),
                ("is_published", models.BooleanField(default=False)),
                ("is_featured", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="products", to="catalog.category")),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="ProductVariant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sku", models.CharField(max_length=64, unique=True)),
                ("weight_grams", models.PositiveIntegerField()),
                ("price", models.DecimalField(decimal_places=2, max_digits=10, validators=[MinValueValidator(Decimal("0"))])),
                ("stock_physical", models.PositiveIntegerField(default=0)),
                ("stock_reserved", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="variants", to="catalog.product")),
            ],
            options={"ordering": ["weight_grams"]},
        ),
        migrations.AddConstraint(
            model_name="productvariant",
            constraint=models.CheckConstraint(condition=models.Q(("stock_reserved__lte", django.db.models.expressions.F("stock_physical"))), name="variant_reserved_not_gt_physical"),
        ),
    ]
