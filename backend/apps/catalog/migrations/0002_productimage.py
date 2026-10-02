import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("catalog", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="ProductImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image_url", models.URLField()),
                ("alt_text", models.CharField(max_length=255)),
                ("credit", models.CharField(blank=True, max_length=160)),
                ("position", models.PositiveSmallIntegerField(default=0)),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="images", to="catalog.product")),
            ],
            options={"ordering": ["position", "id"]},
        ),
        migrations.AddConstraint(
            model_name="productimage",
            constraint=models.UniqueConstraint(fields=("product", "position"), name="product_image_unique_position"),
        ),
    ]
