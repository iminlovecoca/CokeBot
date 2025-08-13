// utils/dictionary.js

const words = [
  // 1000 từ trung bình đến khó
  'phát minh', 'chiến lược', 'nghiệp vụ', 'hành lang', 'tác nghiệp', 'đột phá',
  'kịch bản', 'tuyên truyền', 'khái niệm', 'định hướng', 'bối cảnh', 'biện pháp',
  'trách nhiệm', 'thẩm quyền', 'chính sách', 'nền tảng', 'tổ chức', 'sáng kiến',
  'hành trình', 'bản sắc', 'phân tích', 'kế hoạch', 'dự báo', 'nghiên cứu',
  'thành tựu', 'tiềm năng', 'định vị', 'chiến dịch', 'giải pháp', 'kỹ năng',
  'thảo luận', 'thỏa thuận', 'phương án', 'vấn đề', 'hệ thống', 'triển khai',
  'tổng hợp', 'thống kê', 'phân loại', 'thuật toán', 'kết luận', 'chuyển giao',
  'đề xuất', 'tiêu chuẩn', 'thể chế', 'bảo tồn', 'phát triển', 'kiểm nghiệm',
  'tối ưu', 'chuẩn hóa', 'tích hợp', 'tái cấu trúc', 'đặc điểm', 'ứng dụng',
  'đổi mới', 'tự chủ', 'hiệu quả', 'nhận thức', 'bền vững', 'tư duy',
  'sáng tạo', 'học thuật', 'hợp tác', 'giá trị', 'nguyên tắc', 'giới hạn',
  'kỹ thuật', 'công nghệ', 'vận hành', 'điều phối', 'kiểm soát', 'tác động',
  'mục tiêu', 'nội dung', 'phân bổ', 'thực hiện', 'nâng cao', 'cảnh báo',
  'chu kỳ', 'tầm nhìn', 'phương thức', 'tài nguyên', 'tiêu chí', 'chất lượng',
  'định mức', 'phạm vi', 'điều kiện', 'cơ sở', 'nội hàm', 'hàm lượng',
  'hành vi', 'thị trường', 'cạnh tranh', 'định giá', 'tiêu thụ', 'nhu cầu',
  'thống nhất', 'liên kết', 'tổng thể', 'chi tiết', 'đặc trưng', 'tiềm lực',
  'chiều sâu', 'tăng trưởng', 'bảo đảm', 'kiểm định', 'chứng nhận', 'xuất xứ',
  'chuyển đổi', 'số hóa', 'hội nhập', 'liên ngành', 'quản lý', 'đổi mới sáng tạo',
  'công nghiệp', 'nông nghiệp', 'giáo dục', 'y tế', 'khoa học', 'văn hóa',
  'xã hội', 'an ninh', 'quốc phòng', 'kỹ sư', 'bác sĩ', 'giáo viên',
  'kiến trúc', 'luật pháp', 'doanh nghiệp', 'quản trị', 'tài chính', 'kinh doanh',
  'đầu tư', 'tiếp thị', 'truyền thông', 'thương hiệu', 'vận tải', 'giao thông',
  'phát thanh', 'truyền hình', 'báo chí', 'xuất bản', 'năng lượng', 'môi trường',
  'biến đổi khí hậu', 'ô nhiễm', 'rác thải', 'tái chế', 'nước sạch', 'năng suất',
  'lương thực', 'thực phẩm', 'chăn nuôi', 'trồng trọt', 'canh tác', 'nông thôn',
  'đô thị', 'thị xã', 'tỉnh lỵ', 'huyện lỵ', 'xã hội học', 'tâm lý học',
  'nhân học', 'triết học', 'ngôn ngữ học', 'lịch sử', 'địa lý', 'vật lý',
  'hóa học', 'sinh học', 'toán học', 'tin học', 'công nghệ thông tin', 'trí tuệ nhân tạo',
  'dữ liệu lớn', 'máy học', 'học sâu', 'phân tích dữ liệu', 'an toàn mạng', 'mã hóa',
  'viễn thông', 'vệ tinh', 'quỹ đạo', 'thiết bị', 'phần mềm', 'phần cứng',
  'hệ điều hành', 'ứng dụng di động', 'máy chủ', 'điện toán đám mây', 'mạng không dây',
  'kết nối', 'băng thông', 'tốc độ mạng', 'truy cập', 'ứng dụng', 'nền tảng số',
  'số liệu', 'biểu đồ', 'phân tích thống kê', 'cơ sở dữ liệu', 'người dùng', 'trải nghiệm người dùng',
  'giao diện', 'thiết kế', 'lập trình', 'hệ thống phân tán', 'bảo mật', 'quản trị mạng',
  'tương tác', 'thuật ngữ', 'cấu trúc dữ liệu', 'giải thuật', 'trực tuyến', 'ngoại tuyến',
  'công cụ', 'giải pháp phần mềm', 'hỗ trợ kỹ thuật', 'quản lý dự án', 'điều phối viên', 'phân quyền',
  'trách nhiệm pháp lý', 'thỏa thuận hợp tác', 'quy trình làm việc', 'đánh giá hiệu suất', 'kiểm toán nội bộ', 'báo cáo tài chính',
  'ngân sách', 'tài chính công', 'thị trường vốn', 'thị trường chứng khoán', 'chiến lược phát triển', 'chính sách công',
  'quy hoạch đô thị', 'xây dựng cơ sở hạ tầng', 'nâng cấp công nghệ', 'bảo mật thông tin', 'đào tạo nhân lực', 'phát triển bền vững',
  'thuật sĩ', 'phán xét', 'chân dung', 'tượng trưng', 'viễn cảnh', 'tăng tốc', 'giải mã', 'quy đổi', 'tư pháp', 'hành chính',
  'tiếp cận', 'phân rã', 'chẩn đoán', 'can thiệp', 'diễn biến', 'phát đồ', 'nghi lễ', 'lập luận', 'thể hiện', 'hướng dẫn',
  'trình bày', 'xác minh', 'tinh luyện', 'hòa nhập', 'truy nguyên', 'định chế', 'bổ sung', 'điều chỉnh', 'khẳng định', 'lồng ghép',
  'truyền dẫn', 'tái hiện', 'khôi phục', 'giám sát', 'thẩm định', 'phản biện', 'chuyển tải', 'tích lũy', 'tái tạo', 'khởi tạo',
  'hồi phục', 'hướng nghiệp', 'xu hướng', 'đào sâu', 'chắt lọc', 'kết tinh', 'cố định', 'phân tách', 'phân lớp', 'kích hoạt',
  'phản xạ', 'xúc tác', 'tiên đoán', 'nhận diện', 'thẩm thấu', 'chuyển hoá', 'biến tấu', 'chuyển biến', 'đối chứng', 'khái quát',
  'tổng kết', 'cân đối', 'nghiêm ngặt', 'kỷ luật', 'tái phân phối', 'tái đầu tư', 'liên hoàn', 'thấu cảm', 'tự phản tỉnh', 'lý tưởng', 
  'lý luận', 'phản hồi', 'tự học', 'tự chủ', 'đổi mới giáo dục', 'giáo trình',
  'phương pháp luận', 'mô hình', 'chỉ tiêu', 'truyền thống', 'phân tích', 'thuyết trình',
  'hội thảo', 'diễn đàn', 'đầu mối', 'lý thuyết', 'chuyên gia', 'nghiệp vụ sư phạm',
  'tư tưởng', 'thành phần', 'kiến tạo', 'tích cực', 'phản ứng', 'bản năng',
  'kiến thức nền', 'dẫn chứng', 'kỹ năng mềm', 'ứng xử', 'giao tiếp', 'hành động',
  'điểm mạnh', 'điểm yếu', 'cải cách', 'kết nối', 'tương lai hóa', 'tự do học thuật',
  'bằng chứng', 'kiểm soát nội bộ', 'nghiêm túc', 'cam kết', 'chuyên môn',
  'nghiên cứu ứng dụng', 'nhu cầu xã hội', 'liên tục', 'học tập suốt đời', 'định hướng nghề nghiệp', 'phân tầng xã hội',
  'công bằng', 'hội đồng', 'cơ chế', 'thị trường lao động', 'định vị thương hiệu', 'chiến dịch truyền thông',
  'đơn vị chức năng', 'bài toán thực tiễn', 'số hoá tài liệu', 'tài sản trí tuệ', 'bản quyền', 'đạo đức nghề nghiệp',
  'phân tích hệ thống', 'chuẩn đầu ra', 'khả năng thích nghi', 'xử lý tình huống', 'bằng cấp', 'hồ sơ năng lực',
  'cạnh tranh toàn cầu', 'hợp đồng lao động', 'thu nhập ổn định', 'mạng lưới hợp tác', 'trung tâm nghiên cứu', 'ngành mũi nhọn',
  'quyền lợi', 'phân công lao động', 'chuyển giao tri thức', 'phân tích thị phần', 'hội nhập văn hóa', 'phát triển cộng đồng',
  'nhận diện thương hiệu', 'dự đoán xu hướng', 'truy xuất nguồn gốc', 'quy mô sản xuất', 'kết nối cộng đồng', 'khởi nghiệp',
  'nhà sáng lập', 'quản trị doanh nghiệp', 'xây dựng đội ngũ', 'gọi vốn đầu tư', 'thuyết phục nhà đầu tư', 'định giá tài sản',
  'định hướng nhân lực', 'phân bổ nguồn lực', 'bản đồ chiến lược', 'tư duy phản biện', 'văn hóa tổ chức', 'tối ưu quy trình',
  'định vị thị trường', 'đào tạo kỹ năng', 'phát triển cá nhân', 'giải quyết vấn đề', 'quản lý rủi ro', 'đổi mới quy trình',
  'mô hình kinh doanh', 'tăng trưởng đột phá', 'xây dựng thương hiệu', 'kiến thức chuyên sâu', 'định hình tư duy',
  'đánh giá hiệu quả', 'giao tiếp chuyên nghiệp', 'kỹ năng lãnh đạo', 'quản lý thời gian', 'phát triển bền vững', 'kết nối liên ngành', 
  'con mèo', 'trái táo', 'nhà cao', 'xe đạp', 'học sinh',
  'cây xanh', 'nước mưa', 'trăng sáng', 'mặt trời', 'con đường',
  'giọt nước', 'bàn ghế', 'cuốn sách', 'đèn bàn', 'cái bút',
  'trường học', 'lớp học', 'thầy cô', 'bạn bè', 'giờ ra chơi',
  'giáo viên chủ nhiệm', 'kiểm tra miệng', 'thi cuối kỳ', 'làm bài tập',
  'chơi cờ vua', 'chơi ghép hình', 'chơi đàn', 'chơi đá banh', 'chơi cầu lông',

];

function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

function shuffleWord(word) {
  const chars = word.replace(/\s/g, '').split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

module.exports = {
  getRandomWord,
  shuffleWord
};
