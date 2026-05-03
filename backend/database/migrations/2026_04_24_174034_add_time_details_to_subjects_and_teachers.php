<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddTimeDetailsToSubjectsAndTeachers extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->string('days')->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
        });

        Schema::table('teachers', function (Blueprint $table) {
            $table->json('availability_details')->nullable();
        });
    }

    public function down()
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn(['days', 'start_time', 'end_time']);
        });

        Schema::table('teachers', function (Blueprint $table) {
            $table->dropColumn('availability_details');
        });
    }
}
