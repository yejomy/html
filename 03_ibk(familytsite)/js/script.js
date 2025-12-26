$(function(){

    $(".family2 .family_list").hide();
    $(".family .family_list").hide();

    // 패밀리1 버튼
    $(".family button").click(function(){
    $(".family .family_list").toggle();
    $(".family2 .family_list").hide();
    });

    // 패밀리2 버튼
    $(".family2 button").click(function(){
    $(".family2 .family_list").toggle();
    $(".family .family_list").hide();
    });

    //한쪽 박스 클릭 block
});
