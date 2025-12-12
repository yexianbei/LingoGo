class MLCModel {
  final String modelID;
  final String modelLib;
  final String? modelPath;
  final String? modelURL;
  final int estimatedVRAMReq;
  final String displayName;

  MLCModel({
    required this.modelID,
    required this.modelLib,
    this.modelPath,
    this.modelURL,
    required this.estimatedVRAMReq,
    required this.displayName,
  });

  factory MLCModel.fromJson(Map<String, dynamic> json) {
    return MLCModel(
      modelID: json['modelID'] as String,
      modelLib: json['modelLib'] as String,
      modelPath: json['modelPath'] as String?,
      modelURL: json['modelURL'] as String?,
      estimatedVRAMReq: json['estimatedVRAMReq'] as int,
      displayName: json['displayName'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'modelID': modelID,
      'modelLib': modelLib,
      'modelPath': modelPath,
      'modelURL': modelURL,
      'estimatedVRAMReq': estimatedVRAMReq,
      'displayName': displayName,
    };
  }
}
