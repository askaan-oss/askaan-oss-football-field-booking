class UserModel {
  final int id;
  final String username;
  final String fullName;
  final String phone;
  final String? email;
  final String role; // 'admin', 'staff', 'customer'

  UserModel({
    required this.id,
    required this.username,
    required this.fullName,
    required this.phone,
    this.email,
    required this.role,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['user_id'] ?? 0,
      username: json['username'] ?? '',
      fullName: json['full_name'] ?? json['fullname'] ?? json['username'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'],
      role: json['role'] ?? 'customer',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'full_name': fullName,
      'phone': phone,
      'email': email,
      'role': role,
    };
  }

  bool get isCustomer => role == 'customer';
  bool get isStaff => role == 'staff';
  bool get isAdmin => role == 'admin';
}

