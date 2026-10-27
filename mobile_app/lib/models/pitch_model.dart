class PitchImageModel {
  final int id;
  final String imageUrl;
  final String? caption;

  PitchImageModel({
    required this.id,
    required this.imageUrl,
    this.caption,
  });

  factory PitchImageModel.fromJson(Map<String, dynamic> json) {
    return PitchImageModel(
      id: json['id'] ?? 0,
      imageUrl: json['image_url'] ?? '',
      caption: json['caption'],
    );
  }
}

class PitchReviewModel {
  final int id;
  final int rating;
  final String? comment;
  final String reviewerName;
  final String createdAt;

  PitchReviewModel({
    required this.id,
    required this.rating,
    this.comment,
    required this.reviewerName,
    required this.createdAt,
  });

  factory PitchReviewModel.fromJson(Map<String, dynamic> json) {
    return PitchReviewModel(
      id: json['id'] ?? 0,
      rating: json['rating'] ?? 5,
      comment: json['comment'],
      reviewerName: json['reviewer_name'] ?? json['full_name'] ?? 'Khách hàng',
      createdAt: json['created_at'] ?? '',
    );
  }
}

class PitchModel {
  final int id;
  final String name;
  final String type; // '5' hoặc '7'
  final double priceDefault;
  final String status; // 'active', 'maintenance'
  final String? description;
  final String? image;
  final double averageRating;
  final int reviewCount;
  final List<PitchImageModel> images;
  final List<PitchReviewModel> reviews;

  PitchModel({
    required this.id,
    required this.name,
    required this.type,
    required this.priceDefault,
    required this.status,
    this.description,
    this.image,
    this.averageRating = 5.0,
    this.reviewCount = 0,
    this.images = const [],
    this.reviews = const [],
  });

  factory PitchModel.fromJson(Map<String, dynamic> json) {
    final imagesList = (json['images'] as List?)
            ?.map((item) => PitchImageModel.fromJson(item))
            .toList() ??
        [];

    final reviewsList = (json['reviews'] as List?)
            ?.map((item) => PitchReviewModel.fromJson(item))
            .toList() ??
        [];

    return PitchModel(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      type: json['type']?.toString() ?? '5',
      priceDefault: double.tryParse(json['price_default']?.toString() ?? '0') ?? 0.0,
      status: json['status'] ?? 'active',
      description: json['description'],
      image: json['avatar_url'] ?? json['image'] ?? json['avatar'],
      averageRating: double.tryParse((json['rating_stats']?['average_rating'] ?? json['average_rating'])?.toString() ?? '5.0') ?? 5.0,
      reviewCount: int.tryParse((json['rating_stats']?['total_reviews'] ?? json['total_reviews'] ?? json['review_count'])?.toString() ?? '0') ?? 0,
      images: imagesList,
      reviews: reviewsList,
    );
  }

  bool get isMaintenance => status == 'maintenance';
}

