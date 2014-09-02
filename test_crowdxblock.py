'''
This is a test for the crowdxblock, attempting to copy test_recommender.py
'''

import json
import itertools
import StringIO
from ddt import ddt, data
from copy import deepcopy

from django.core.urlresolvers import reverse
from django.test.utils import override_settings

from xmodule.modulestore.tests.factories import CourseFactory, ItemFactory
from xmodule.modulestore.tests.django_utils import ModuleStoreTestCase

from courseware.tests.helpers import LoginEnrollmentTestCase
from courseware.tests.modulestore_config import TEST_DATA_MIXED_MODULESTORE
from courseware.tests.factories import GlobalStaffFactory

from lms.lib.xblock.runtime import quote_slashes

@override_settings(MODULESTORE=TEST_DATA_MIXED_MODULESTORE)
class TestCrowdXBlock(ModuleStoreTestCase, LoginEnrollmentTestCase):
    STUDENT_INFO = [('view@test.com', 'foo'), ('view2@test.com', 'foo')]

    def setUp(self):
         self.course = CourseFactory.create(
             display_name='Recommender_Test_Course'
         )
         self.chapter = ItemFactory.create(
             parent=self.course, display_name='Overview'
         )
         self.section = ItemFactory.create(
             parent=self.chapter, display_name='Welcome'
         )
         self.unit = ItemFactory.create(
             parent=self.section, display_name='New Unit'
         )
         self.xblock = ItemFactory.create(
             parent=self.unit,
             category='text_input',
             display_name='text_input'
         )
         self.xblock2 = ItemFactory.create(
             parent=self.unit,
             category='crowdxblock',
             display_name='crowdxblock'
         )

         self.xblock_names = ['text_input', 'crowdxblock']

        self.course_url = reverse(
            'courseware_section',
            kwargs={
                'course_id': self.course.id.to_deprecated_string(),
                'chapter': 'Overview',
                'section': 'Welcome',
            }
        )

        # self.test_crowdxblock here?

        for i, (email, password) in enumerate(self.STUDENT_INFO):
            username = "u{}".format(i)
            self.create_account(username, email, password)
            self.activate_user(email)

        self.staff_user = GlobalStaffFactory()
        
    def get_handler_url(self, handler, xblock_name='recommender'):
        """
        Get url for the specified xblock handler
        """
        return reverse('xblock_handler', kwargs={
            'course_id': self.course.id.to_deprecated_string(),
            'usage_id': quote_slashes(self.course.id.make_usage_key('crowdxblock', xblock_name).to_deprecated_string()),
            'handler': handler,
            'suffix': ''
    })

    def enroll_student(self, email, password):
        """
        Student login and enroll for the course
        """
        self.login(email, password)
        self.enroll(self.course, verify=True)

    def enroll_staff(self, staff):
        """
        Staff login and enroll for the course
        """
        email = staff.email
        password = 'test'
        self.login(email, password)
        self.enroll(self.course, verify=True)

    def add_resource(self, resource, xblock_name='crowdxblock'):
        """
        Add resource to crowdxblock
        """
        url = self.get_handler_url('add_resource', xblock_name)
        resp = self.client.post(url, json.dumps(resource), '')
        return json.loads(resp.content)

    def initialize_database_by_id(
        self, handler, resource_id, times, xblock_name='crowdxblock'
    ):
        """
        Call a ajax event (vote, delete, endorse) on a resource by its id
        several times
        """
        url = self.get_handler_url(handler, xblock_name)
        for _ in range(0, times):
            self.client.post(url, json.dumps({'id': resource_id}), '')

    def call_event(self, handler, event_data, xblock_name='crowdxblock'):
        """
        Call a ajax event (edit, flag) on a resource by providing data
        """
        url = self.get_handler_url(handler, xblock_name)
        resp = self.client.post(url, json.dumps(event_data), '')
        return json.loads(resp.content)


