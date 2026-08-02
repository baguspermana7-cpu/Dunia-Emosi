//shows interstitial page
$(function () {
    var navigationItem = $('#navigation ul li a.active');
    $('a.external-link').click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        $('#header, #content, #footer, #bottom').hide();
        $('#home-animation-pagination, #home-animation-bgm').css('display', 'none');
	$('body').css('overflow','hidden');
        $('#interstitial').show();
        $('#continue').attr('href', $(this).attr('href'));
        var value = this.hostname;
        if (value != null) {
            if (value.indexOf('thomasandfriends') > -1) {
                $('#continue').attr('target', '_self');
            }
            else {
                $('#continue').attr('target', '_blank');
            }
        }
        navigationItem.removeClass('active');
        $(window).trigger('interstitial-opened');

        // video will pause when open the interstitial
        if($("#kids-video-container").length && MattelVideoPlayer!=undefined && MattelVideoPlayer.ooPlayerInstances.players[0].getState() == "playing"){
            MattelVideoPlayer.ooPlayerInstances.players[0].pause();
        }
    });


    $('p.youtube-link').click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        $('#header, #content, #footer, #bottom').hide();
        $('body').css('overflow', 'hidden');
        $('.kidsyoutube').show();
        $('.kidsyoutube #continue').attr('href', $('p.youtube-link a').attr('href'));
        var value = $('p.youtube-link a').attr('href');
        if (value != null) {
            if (value.indexOf('thomasandfriends') > -1) {
                $('.kidsyoutube #continue').attr('target', '_self');
            }
            else {
                $('.kidsyoutube #continue').attr('target', '_blank');
            }
        }
        navigationItem.removeClass('active');
        $(window).trigger('interstitial-opened');
    });

    //hides interstitial page
    
    $('.kidsyoutube #go-back').click(function (e) {
        e.preventDefault();
        e.stopPropagation();

        $('#header, #content, #footer, #bottom').show();
        $('body').css('overflow', 'scroll');
        $('.kidsyoutube').hide();
        $('#continue').removeAttr('href');
        navigationItem.addClass('active');

        // while hidden, carousels may end up with 0 width and need to be reloaded
        $('.carousel-root').jcarousel('reload');

        $(window).trigger('interstitial-closed');
    });

    $('#go-back').click(function (e) {
        e.preventDefault();
        e.stopPropagation();

        $('#header, #content, #footer, #bottom').show();
        $('#home-animation-pagination, #home-animation-bgm').css('display', 'block');
	$('body').css('overflow','scroll');
        $('#interstitial').hide();
        $('#continue').removeAttr('href');
        navigationItem.addClass('active');

        // while hidden, carousels may end up with 0 width and need to be reloaded
        $('.carousel-root').jcarousel('reload');

        $(window).trigger('interstitial-closed');
        // video will play when close the interstitial
        if($("#kids-video-container").length && MattelVideoPlayer!=undefined && MattelVideoPlayer.ooPlayerInstances.players[0].getState() == "paused"){
            MattelVideoPlayer.ooPlayerInstances.players[0].play();
        }
    });
    $('#continue').click(function (e) {
        var value = this.hostname;
        if (value != null) {
           if (value.indexOf('thomasandfriends') <= -1) {
               $('#header, #content, #footer, #bottom').show();
                $('#interstitial').hide();
                navigationItem.addClass('active');
                $('.carousel-root').jcarousel('reload');
                $(window).trigger('interstitial-closed');
            }
        }
    });
    $('.youtube-continue').click(function (e) {
        var value = $('.youtube-continue').attr('href');
        if (value != null) {
            if (value.indexOf('thomasandfriends') <= -1) {
                $('#header, #content, #footer, #bottom').show();
                $('.kidsyoutube').hide();
                navigationItem.addClass('active');
                $('.carousel-root').jcarousel('reload');
                $(window).trigger('interstitial-closed');
            }
        }
    });
	/*Thomas Adventures Interstitial */
	$('.details-carousel-wrapper a.apps').click(function(e){
		$('#ThomasAdventuresInterstitial').show();
		$('body').append($('<div class="modal-background"></div>'));
		e.stopPropagation();
		e.preventDefault();
	});
	$('#ThomasAdventuresInterstitial .close-btn').click(function(){
		$('#ThomasAdventuresInterstitial').hide();
		$('.modal-background').remove();
	});
});
