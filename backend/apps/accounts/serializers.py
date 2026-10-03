from rest_framework import serializers


class EmailInputSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)

    def validate_email(self, value):
        return value.strip().lower()


class VerifyLinkSerializer(serializers.Serializer):
    token = serializers.CharField(min_length=32, max_length=128)


class StaffLoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=256, write_only=True, trim_whitespace=False)


class StaffIdentitySerializer(serializers.Serializer):
    username = serializers.CharField()


class CustomerIdentitySerializer(serializers.Serializer):
    email = serializers.EmailField()


class SessionSerializer(serializers.Serializer):
    csrf_token = serializers.CharField()
    staff = StaffIdentitySerializer(allow_null=True)
    customer = CustomerIdentitySerializer(allow_null=True)


class MessageSerializer(serializers.Serializer):
    detail = serializers.CharField()
