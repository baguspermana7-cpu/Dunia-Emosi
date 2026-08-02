$(function() {

/* ==========================================================================
   Navigation
   ========================================================================== */
  ResponsiveElements.setup('#navigation', {
    desktop: {
      landscape: {
        dynamic: {width: 110, minHeight: '672px'},
        static: {height: 'auto'}
      },
      portrait: {
        dynamic: {height: 113},
        static: {width: 'auto', minHeight: 0}
      }
    },
    mobile: {
      landscape: {
        dynamic: {width: 95, minHeight: '480px'},
        static: {height: 'auto'}
      },
      portrait: {
        dynamic: {height: 95},
        static: {width: 'auto', minHeight: 0}
      }
    }
  });

  ResponsiveElements.setup('#navigation #nav-logo', {
    desktop: {
      landscape: {
        dynamic: {width: 144, height: 79, marginLeft: '8px', marginTop: '18px'}
      },
      portrait: {
        dynamic: {width: 168, height: 90, marginLeft: '11px', marginTop: '10px'}
      }
    },
    mobile: {
      dynamic: {width: 113, height: 60},
      landscape: {
        dynamic: {marginLeft: '4px', marginTop: '7px'}
      },
      portrait: {
        dynamic: {marginLeft: '10px', marginTop: '15px'}
      }
    }
  });

  ResponsiveElements.setup('#navigation #nav-parents', {
    static: {marginLeft: 0},
    landscape: {
      static: {top: 'auto'}
    },
    desktop: {
      dynamic: {fontSize: '14px', paddingTop: '11px'},
      landscape: {
        dynamic: {lineHeight: '52px', height: 52, paddingLeft: '19px', paddingRight: '43px'}
      },
      portrait: {
        dynamic: {lineHeight: '46px', height: 46, paddingLeft: '47px', paddingRight: '17px', top: '20px'}
      }
    },
    mobile: {
      dynamic: {fontSize: '15px', paddingTop: '10px'},
      landscape: {
        dynamic: {lineHeight: '40px', height: 40, paddingLeft: '12px', paddingRight: '45px'}
      },
      portrait: {
        dynamic: {lineHeight: '42px', height: 46, paddingLeft: '66px', paddingRight: '33px', top: '15px', marginLeft: '-48px'}
      }
    }
  });
  ResponsiveElements.setup('.de-de #navigation #nav-parents', {
    
      desktop: {
          dynamic: {fontSize: '12px', paddingTop: '11px'}
      },
      mobile: {
          dynamic: {fontSize: '15px', paddingTop: '10px'}
      }
  });
  ResponsiveElements.setup('#navigation #nav-parents em', {
    mobile: {
      portrait: {
        dynamic: {width: 48}
      }
    }
  });

  ResponsiveElements.setup('#navigation ul', {
    desktop: {
      landscape: {
        dynamic: {marginLeft: 0}
      },
      portrait: {
        dynamic: {marginLeft: '1px'}
      }
    },
    mobile: {
      landscape: {
        dynamic: {marginLeft: '1px'}
      },
      portrait: {
        dynamic: {marginLeft: '-17px'}
      }
    }
  });

  ResponsiveElements.setup('#navigation ul li a', {
    desktop: {
      dynamic: {fontSize: '14px', lineHeight: '16px'},
      landscape: {
        dynamic: {marginTop: '12px'},
        static: {marginLeft: 0}
      },
      portrait: {
        dynamic: {marginTop: '10px', marginLeft: '18px'}
      }
    },
    mobile: {
      dynamic: {fontSize: '15px', lineHeight: '17px'},
      landscape: {
        dynamic: {marginTop: '4px'},
        static: {marginLeft: 0}
      },
      portrait: {
        dynamic: {marginTop: '7px', marginLeft: '20px'}
      }
    }
  });

  ResponsiveElements.setup('.de-de #navigation ul li a', {
      desktop: {
          dynamic: { fontSize: '12px', lineHeight: '16px' }
      },
      mobile: {
          dynamic: { fontSize: '15px', lineHeight: '17px' }
      }
  });

  ResponsiveElements.setup('#navigation ul li a span', {
    desktop: {
      landscape: {
        dynamic: {width: 76, height: 76}
      },
      portrait: {
        dynamic: {width: 68, height: 68}
      }
    },
    mobile: {
      landscape: {
        dynamic: {width: 62, height: 62}
      },
      portrait: {
        dynamic: {width: 57, height: 57}
      }
    }
  });

/* ==========================================================================
   Content
   ========================================================================== */
  ResponsiveElements.setup('#skrollr-body', {
    desktop: {
      landscape: {
        dynamic: {paddingLeft: '110px'},
        static: {paddingTop: 0}
      },
      portrait: {
        dynamic: {paddingTop: '113px'},
        static: {paddingLeft: 0}
      }
    },
    mobile: {
      landscape: {
        dynamic: {paddingLeft: '95px'},
        static: {paddingTop: 0}
      },
      portrait: {
        dynamic: {paddingTop: '95px'},
        static: {paddingLeft: 0}
      }
    }
  });

/* ==========================================================================
   Footer
   ========================================================================== */
/*
  ResponsiveElements.setup('#footer, #bottom', {
    desktop: {
      landscape: {
        dynamic: {paddingLeft: '110px'}
      },
      portrait: {
        static: {paddingLeft: 0}
      }
    },
    mobile: {
      landscape: {
        dynamic: {paddingLeft: '95px'}
      },
      portrait: {
        static: {paddingLeft: 0}
      }
    }
  });
*/
  
  /* ==========================================================================
   Carousel
   ========================================================================== */
  ResponsiveElements.setup('.details-carousel-wrapper', {
    desktop: {
      landscape: {
        dynamic: {width: 900}
      },
      portrait: {
        dynamic: {width: 636}
      }
    },
    mobile: {
      landscape: {
        dynamic: {width: 611}
      },
      portrait: {
        dynamic: {width: 464}
      }
    }
  });
  
  // ResponsiveElements.setup('.carousel.details-carousel .carousel-root', {
    // desktop: {
      // landscape: {
        // dynamic: {paddingBottom: '40px'}
      // },
      // portrait: {
        // dynamic: {paddingBottom: '33px'}
      // }
    // },
    // mobile: {
      // dynamic: {paddingBottom: '37px'}
    // }
  // });
  ResponsiveElements.setup('.carousel.details-carousel.with-controls', {
    desktop: {
      landscape: {
        dynamic: {paddingLeft: '42px', paddingRight: '42px'}
      },
      portrait: {
        dynamic: {paddingLeft: '47px', paddingRight: '47px'}
      }
    },
    mobile: {
      landscape: {
        dynamic: {paddingLeft: '43px', paddingRight: '43px'}
      },
      portrait: {
        dynamic: {paddingLeft: '40px', paddingRight: '40px'}
      }
    }
  });
  // ResponsiveElements.setup('.carousel.details-carousel .carousel-item a em.border', {
    // desktop: {
      // dynamic: {borderWidth: '8px'}
    // },
    // mobile: {
      // dynamic: {borderWidth: '6px'}
    // }
  // });
  ResponsiveElements.setup('.carousel.details-carousel .controls span', {
    desktop: {
      landscape: {
        dynamic: {marginTop: '-54px'}
      },
      portrait: {
        dynamic: {marginTop: '-44.5px'}
      }
    },
    mobile: {
      landscape: {
        dynamic: {marginTop: '-47.5px'}
      },
      portrait: {
        dynamic: {marginTop: '-48.5px'}
      }
    }
  });
  ResponsiveElements.setup('.carousel.details-carousel .controls span.previous', {
    desktop: {
      landscape: {
        dynamic: {borderTopWidth: '34px', borderRightWidth: '34px', borderBottomWidth: '34px'},
        static: {borderLeftWidth: 0}
      },
      portrait: {
        dynamic: {borderTopWidth: '28px', borderRightWidth: '28px', borderBottomWidth: '28px'},
        static: {borderLeftWidth: 0}
      }
    },
    mobile: {
      landscape: {
        dynamic: {borderTopWidth: '29px', borderRightWidth: '29px', borderBottomWidth: '29px'},
        static: {borderLeftWidth: 0}
      },
      portrait: {
        dynamic: {borderTopWidth: '30px', borderRightWidth: '30px', borderBottomWidth: '30px'},
        static: {borderLeftWidth: 0}
      }
    }
  });
  ResponsiveElements.setup('.carousel.details-carousel .controls span.next', {
    desktop: {
      landscape: {
        dynamic: {borderTopWidth: '34px', borderBottomWidth: '34px', borderLeftWidth: '34px'},
        static: {borderRightWidth: 0}
      },
      portrait: {
        dynamic: {borderTopWidth: '28px', borderBottomWidth: '28px', borderLeftWidth: '28px'},
        static: {borderRightWidth: 0}
      }
    },
    mobile: {
      landscape: {
        dynamic: {borderTopWidth: '29px', borderBottomWidth: '29px', borderLeftWidth: '29px'},
        static: {borderRightWidth: 0}
      },
      portrait: {
        dynamic: {borderTopWidth: '28px', borderBottomWidth: '28px', borderLeftWidth: '28px'},
        static: {borderRightWidth: 0}
      }
    }
  });
  // ResponsiveElements.setup('.carousel.details-carousel .carousel-item a span', {
    // desktop: {
      // landscape: {
        // dynamic: {fontSize: '14.25px', height: 32.6, lineHeight: '16.3px'}
      // },
      // portrait: {
        // dynamic: {fontSize: '11.4px', height: 26, lineHeight: '13px'}
      // }
    // },
    // mobile: {
      // dynamic: {fontSize: '12.5px', height: 28.6, lineHeight: '14.3px'}
    // }
  // });
  ResponsiveElements.setup('.carousel.details-carousel .carousel-item a.video em.border strong', {
    dynamic: {fontSize: '11px'}
  });



/* ==========================================================================
   Videos and games Landing grid
   ========================================================================== */
  ResponsiveElements.setup('.videos-and-games-thumbs a.kids-game strong, a.kids-game strong, .videos-and-games-thumbs a.kids-video strong, .carousel.details-carousel .carousel-item a em.border', {
    desktop: {
      dynamic: {borderWidth: '6px'}
    },
    mobile: {
      dynamic: {borderWidth: '4px'}
    }
  });
  // ResponsiveElements.setup('#kids-games-thumbs-wrapper a.kids-game span, #kids-games-thumbs-wrapper a.kids-video span', {
    // desktop: {
      // landscape: {
        // dynamic: {fontSize: '14.25px', height: 32.6, lineHeight: '14.25px'}
      // },
      // portrait: {
        // dynamic: {fontSize: '11.4px', height: 26, lineHeight: '13px'}
      // }
    // },
    // mobile: {
      // dynamic: {fontSize: '14px', height: 28.6, lineHeight: '14px'}
    // }
  // });
  // ResponsiveElements.setup('a.kids-game strong, a.kids-game strong img, a.kids-video strong', {
    // desktop: {
      // landscape: {
        // dynamic: {width: '192px', height: '108px'}
      // },
      // portrait: {
        // dynamic: {width: '182px', height: '102px'}
      // }
    // },
    // mobile: {
      // portrait: {
        // dynamic: {width: '192px', height: '108px'}
      // },
      // landscape: {
        // dynamic: {width: '182px', height: '102px'}
      // }
    // }
  // });
//   
  // ResponsiveElements.setup('.videos-and-games-thumbs a.kids-video strong img', {
   // desktop: {
     // portrait: {
       // dynamic: {width: '192px', height: '145px'}
     // },
     // landscape: {
       // dynamic: {width: '192px', height: '145px'}
     // }
   // },
   // mobile: {
     // portrait: {
       // dynamic: {width: '192px', height: '145px'}
     // },
     // landscape: {
       // dynamic: {width: '182px', height: '135px'}
     // }
   // }
  // });
  
/* ==========================================================================
   Videos Landing
   ========================================================================== */
  ResponsiveElements.setup('.kids-video strong em', {
    dynamic: {fontSize: '11px'}
  });

/* ==========================================================================
   Engines Landing
   ========================================================================== */

  ResponsiveElements.setup('#engines-list', {
    dynamic: {margin: '5px'}
  });
  ResponsiveElements.setup('#engines-list .item .gutter', {
    dynamic: {left: '5px', right: '5px', top: '5px', bottom: '5px'}
  });
  ResponsiveElements.setup('#engines-list .item.size-2x2 .title', {
    dynamic: {fontSize: '40px'}
  });
  ResponsiveElements.setup('#engines-list .item:not(.size-2x2) .title', {
    dynamic: {fontSize: '28px'}
  });
  
/* ==========================================================================
   Games Landing
   ========================================================================== */ 
  ResponsiveElements.setup('#kids-gamess-wrapper', {
    desktop: {
      dynamic: {paddingBottom: '110px'},
      landscape: {
        dynamic: {width: '900px'}
      },
      portrait: {
        dynamic: {width: '522px'}
      }
    },
    mobile: {
      landscape: {
        dynamic: {width: '522px'}
      },
      portrait: {
        dynamic: {width: '455px'}
      }
    }
  });

/* ==========================================================================
   Engines detail
   ========================================================================== */
  /* fixed aspect ratio container for the engines animation */
  ResponsiveElements.setup('#engine-detail-animation', {
    desktop: {
      landscape: {
        dynamic: {width: '693px', height: '568px'},
        static: {left: '0px'}
      },
      portrait: {
        dynamic: {width: '716px', height: '587px', left: '-119px'}
      }
    },
    mobile: {
      landscape: {
        dynamic: {width: '487px', height: '400px'},
        static: {left: '0px'}
      },
      portrait: {
        dynamic: {width: '511px', height: '419px', left: '-85px'}
      }
    }
  });


  /* back link */
  ResponsiveElements.setup('.kids-back-arrow', {
    desktop: {
      landscape: {
        dynamic: {lineHeight: '40px', fontSize: '14px', marginTop: '27px', marginBottom: '27px'},
        static: {marginLeft: '5%'}
      },
      portrait: {
        dynamic: {lineHeight: '40px', fontSize: '14px', marginTop: '23px', marginBottom: '23px'},
        static: {marginLeft: '5%'}
      }
    },
    mobile: {
      landscape: {
        dynamic: {lineHeight: '30px', fontSize: '10px', marginTop: '18px', marginBottom: '18px'},
        static: {marginLeft: '5%'}
      },
      portrait: {
        dynamic: {lineHeight: '30px', fontSize: '10px', marginTop: '15px', marginBottom: '15px'},
        static: {marginLeft: '5%'}
      }
    }
  });

  /* engine navigation arrows */
  ResponsiveElements.setup('#previous-engine', {
    desktop: {
      dynamic: {'border-top-width': '40px', 'border-right-width': '40px', 'border-bottom-width': '40px', 'border-left-width': '0px'}
    },
    mobile: {
      dynamic: {'border-top-width': '20px', 'border-right-width': '20px', 'border-bottom-width': '20px', 'border-left-width': '0px'}
    }
  });
  ResponsiveElements.setup('#next-engine', {
    desktop: {
      dynamic: {'border-top-width': '40px', 'border-right-width': '0px', 'border-bottom-width': '40px', 'border-left-width': '40px', 'margin-left': '-40px'}
    },
    mobile: {
      dynamic: {'border-top-width': '20px', 'border-right-width': '0px', 'border-bottom-width': '20px', 'border-left-width': '20px', 'margin-left': '-20px'}
    }
  });

  /* engine details container */
  ResponsiveElements.setup('.kids-back-arrow em', {
    desktop: {
      dynamic: {width: '40px', height: '40px'}
    },
    mobile: {
      dynamic: {width: '30px', height: '30px'}
    }
  });
  ResponsiveElements.setup('.kids-engine-details', {
    desktop: {
      landscape: {
        dynamic: {left: '693px'}
      },
      portrait: {
        dynamic: {left: '478px'}
      }
    },
    mobile: {
      landscape: {
        dynamic: {left: '478px'}
      },
      portrait: {
        dynamic: {left: '341px'}
      }
    }
  });

  ResponsiveElements.setup('#kids-engine-details-width-reference', {
    desktop: {
      landscape: {
        dynamic: {width: 221}
      },
      portrait: {
        dynamic: {width: 194}
      }
    },
    mobile: {
      landscape: {
        dynamic: {width: 138}
      },
      portrait: {
        dynamic: {width: 139}
      }
    }
  });

  /* engine details elements */

  /* engine name big*/
  ResponsiveElements.setup('.kids-engine-details .badge .name', {
    desktop: {
      dynamic: {fontSize: '80px'}
    },
    mobile: {
      dynamic: {fontSize: '56px'}
    }
  });

  ResponsiveElements.setup('.ru-ru .kids-engine-details .badge .name' , {
      desktop: {
          dynamic: { fontSize: '42px' }
      },
      mobile: {
          dynamic: { fontSize: '27px' }
      }
  });
  ResponsiveElements.setup('.de-de .kids-engine-details .badge .name', {
      desktop: {
          dynamic: { fontSize: '42px' }
      },
      mobile: {
          dynamic: { fontSize: '27px' }
      }
  });

  ResponsiveElements.setup('.el-gr .kids-engine-details .badge .name', {
      desktop: {
          dynamic: { fontSize: '42px' }
      },
      mobile: {
          dynamic: { fontSize: '27px' }
      }
  });

  ResponsiveElements.setup('.es-es .kids-engine-details .badge .name', {
      desktop: {
          dynamic: { fontSize: '42px' }
      },
      mobile: {
          dynamic: { fontSize: '27px' }
      }
  });
  ResponsiveElements.setup('.pl-pl .kids-engine-details .badge .name', {
      desktop: {
          dynamic: { fontSize: '30px' }
      },
      mobile: {
          dynamic: { fontSize: '22px' }
      }
  });
  /* engine number and location */
  ResponsiveElements.setup('.kids-engine-details .badge .location', {
    desktop: {
      dynamic: {fontSize: '10px', height: '41px'}
    },
    mobile: {
      dynamic: {fontSize: '7px', height: '29px'}
    }
  });
  ResponsiveElements.setup('.kids-engine-details .badge .location span.train-number', {
    desktop: {
      dynamic: {width: '41px', height: '41px', fontSize: '27px'}
    },
    mobile: {
      dynamic: {width: '29px', height: '29px', fontSize: '19px'}
    }
  });
  ResponsiveElements.setup('.kids-engine-details .badge .location span.train-number span', {
    desktop: {
      dynamic: {fontSize: '10px'}
    },
    mobile: {
      dynamic: {fontSize: '7px'}
    }
  });

  /* engine title */
  ResponsiveElements.setup('.kids-engine-details .badge .title', {
    desktop: {
      dynamic: {fontSize: '10px'}
    },
    mobile: {
      dynamic: {fontSize: '7px'}
    }
  });

  /* hear about the engine*/
  ResponsiveElements.setup('.kids-engine-details .hear-about', {
    desktop: {
      landscape: {
        dynamic: {height: '85px', marginTop: '28px'}
      },
      portrait: {
        dynamic: {height: '83px', marginTop: '70px'}
      }
    },
    mobile: {
      landscape: {
        dynamic: {height: '72px', marginTop: '10px'}
      },
      portrait: {
        dynamic: {height: '73px', marginTop: '15px'}
      }
    }
  });
  ResponsiveElements.setup('.kids-engine-details .hear-about em', {
    desktop: {
      landscape: {
        dynamic: {width: '63px', height: '63px'}
      },
      portrait: {
        dynamic: {width: '64px', height: '64px'}
      }
    },
    mobile: {
      landscape: {
        dynamic: {width: '44px', height: '44px'}
      },
      portrait: {
        dynamic: {width: '45px', height: '45px'}
      }
    }
  });
  ResponsiveElements.setup('.kids-engine-details .hear-about span', {
    desktop: {
      landscape: {
        dynamic: {fontSize: '12px'}
      },
      portrait: {
        dynamic: {fontSize: '9px'}
      }
    },
    mobile: {
      landscape: {
        dynamic: {fontSize: '9px', marginTop: '0.5em'}
      },
      portrait: {
        dynamic: {fontSize: '9px', marginTop: '0.5em'}
      }
    }
  });

  /* read about */
  ResponsiveElements.setup('.kids-engine-details .read-about', {
    desktop: {
      landscape: {
        dynamic: {marginTop: '65px', fontSize: '14px', lineHeight: '53px', height: '53px'}
      },
      portrait: {
        dynamic: {marginTop: '38px', fontSize: '14px', lineHeight: '53px', height: '53px'}
      }
    },
    mobile: {
      landscape: {
        dynamic: {marginTop: '5px', fontSize: '10px', lineHeight: '37px', height: '37px'}
      },
      portrait: {
        dynamic: {marginTop: '15px', fontSize: '10px', lineHeight: '38px', height: '38px'}
      }
    }
  });
  ResponsiveElements.setup('.kids-engine-details .read-about em', {
    dynamic: {width: '26px', height: '20px'}
  });
  ResponsiveElements.setup('.kids-engine-details .read-about span', {
    dynamic: {paddingLeft: '15px', paddingRight: '15px'}
  });

  ResponsiveElements.setup('.kids-engine-more-info', {
    desktop: {
      landscape: {
        dynamic: {width: 343, right: '-343px'}
      },
      portrait: {
        dynamic: {width: 238, right: '-238px'}
      }
    },
    mobile: {
      landscape: {
        dynamic: {width: 241, right: '-241px'}
      },
      portrait: {
        dynamic: {width: 170, right: '-170px'}
      }
    }
  });

  ResponsiveElements.setup('#page-scroll', {
    desktop: {
      dynamic: {fontSize: '14px', height: 53, lineHeight: '60px', paddingRight: '60px'}
    },
    mobile: {
      dynamic: {fontSize: '12px', height: 40, lineHeight: '45px', paddingRight: '45px'}
    }
  });
  ResponsiveElements.setup('#page-scroll.sticky', {
    desktop: {
      dynamic: {paddingRight: '53px'}
    },
    mobile: {
      dynamic: {paddingRight: '40px'}
    }
  });
  ResponsiveElements.setup('#page-scroll em', {
    desktop: {
      dynamic: {width: 53, height: 53}
    },
    mobile: {
      dynamic: {width: 40, height: 40}
    }
  });


/* ==========================================================================
   Drawing Tool
   ========================================================================== */
  ResponsiveElements.setup('#drawing-tool-logo', {
      desktop: {
          landscape: {
              dynamic: { width: '110px', height: '59px', left: '10px', top: '10px' }
          },
          portrait: {
              dynamic: { width: '130px', height: '70px', left: '10px', top: '7px' }
          }
      },
      mobile: {
          landscape: {
              dynamic: { width: '105px', height: '56px', left: '17px', top: '15px' }
          },
          portrait: {
              dynamic: { width: '85px', height: '46px', left: '6px', top: '14px' }
          }
      }
  });

  ResponsiveElements.setup('#drawing-tool .button#drawing-tool-close-btn', {
      desktop: {
          landscape: {
              dynamic: { width: '42px', height: '42px', right: '9px', top: '12px' }
          },
          portrait: {
              dynamic: { width: '50px', height: '50px', right: '21px', top: '21px' }
          }
      },
      mobile: {
          landscape: {
              dynamic: { width: '44px', height: '44px', right: '9px', top: '7px' }
          },
          portrait: {
              dynamic: { width: '52px', height: '52px', right: '11px', top: '12px' }
          }
      }
  });

  ResponsiveElements.setup('#drawing-tool .button#drawing-tool-done-btn', {
      desktop: {
          landscape: {
              dynamic: { width: '73px', height: '73px', right: '18px', bottom: '25px' }
          },
          portrait: {
              dynamic: { width: '100px', height: '100px', right: '38px', bottom: '77px' }
          }
      },
      mobile: {
          landscape: {
              dynamic: { width: '67px', height: '67px', right: '6px', bottom: '10px' }
          },
          portrait: {
              dynamic: { width: '79px', height: '79px', right: '11px', bottom: '24px' }
          }
      }
  });

  ResponsiveElements.setup('#drawing-tool #palette', {
      desktop: {
          landscape: {
              dynamic: { transform: 'scale(0.35)', left: '31px' }
          },
          portrait: {
              dynamic: { transform: 'scale(0.42)' }
          }
      },
      mobile: {
          landscape: {
              dynamic: { transform: 'scale(0.33)', left: '19px' }
          },
          portrait: {
              dynamic: { transform: 'scale(0.36)' }
          }
      }
  });

  ResponsiveElements.setup('#drawing-tool #tools-wrapper', {
      desktop: {
          landscape: {
              dynamic: { transform: 'scale(0.61)' }
          },
          portrait: {
              dynamic: { transform: 'scale(0.5)' }
          }
      },
      mobile: {
          landscape: {
              dynamic: { transform: 'scale(0.65)' }
          },
          portrait: {
              dynamic: { transform: 'scale(0.55)' }
          }
      }
  });

/* ==========================================================================
   Once all elements are configured, call the update-elements method
   to process them
   ========================================================================== */
  ResponsiveElements.update();
});
