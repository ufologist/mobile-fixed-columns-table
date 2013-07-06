/*
 * Copyright 
 */

package ufologist.mobile.fixedcolumnstable;

import android.os.Bundle;

import com.phonegap.DroidGap;

/**
 * 
 * @author Sun
 * @version IndexActivity.java 2013-7-5 下午3:43:59
 */
public class IndexActivity extends DroidGap {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.setIntegerProperty("splashscreen", R.drawable.splash);
        super.init();
        super.loadUrl("file:///android_asset/www/index.html");
    }
}
