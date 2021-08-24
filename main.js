import $ from 'jquery'
import Cookies from 'js-cookie'
import psl from 'psl'
import queryString from 'query-string'
import datepicker from 'js-datepicker'
import Big from 'big.js'
import select2 from 'select2'

// CONFIG
const COOKIES_EXPIRATION = 180 // 180 days
const COOKIE_REFERER = 'referer'
const COOKIE_QUERY_STRING = 'query_string'
const COOKIE_WEB_ENTRY_PAGE = 'IN_web_entry_page'
const COOKIE_LANG = 'lang'
const ORIGIN_DOMAIN = 'idealninajemce.cz'

const SELECTOR_FORM = 'form[data-url]'
const FORM_SUBMIT_PAGE = 'IN_web_submit_page'

const SELECTOR_TRANSLATION_TOGGLE_EN = '.lang-toggle-to-en'
const SELECTOR_TRANSLATION_TOGGLE_CS = '.lang-toggle-to-cs'
const SELECTOR_TRANSLATION_CONTENT_EN = '.lang-en'
const SELECTOR_TRANSLATION_CONTENT_CS = '.lang-cs'
const SELECTOR_INPUT_DATEPICKER = '.date'

const SELECTOR_PICKER_CITY = '.selectpickerCity'
const SELECTOR_PICKER_STREET = '.selectpickerStreet'

const SELECTOR_SLIDER_INPUT = '#rangeCalculator'
const SELECTOR_SLIDER_INPUT_VALUE = '#rangeCalculatorInputValue'
const SELECTOR_SLIDER_RESULT_ME = '#rangeCalculatorResultByMe'
const SELECTOR_SLIDER_RESULT_IN = '#rangeCalculatorResultByIN'
const SELECTOR_SLIDER_LOCALE = 'cs-CZ'

const API = 'https://devapi.idealninajemce.cz'

select2($)

$(function () {
  // 0 - shared code in more sections
  const urlParams = queryString.parse(location.search)

  // 1 - general cookie handling
  // set all URL params to a cookie with expiration of 180 days
  Object.keys(urlParams).forEach((key) => {
    Cookies.set(key, urlParams[key], { expires: COOKIES_EXPIRATION })
  })

  // referrer and query params handlng
  const parsedReferrer = psl.parse(document.referrer)
  if (parsedReferrer.domain !== ORIGIN_DOMAIN) {
    // handle referrer
    let referrer = ''
    if (document.referrer !== '') {
      referrer = parsedReferrer.sld
    }
    Cookies.set(COOKIE_REFERER, referrer, { expires: COOKIES_EXPIRATION })

    // handle q param
    if (urlParams.q) {
      Cookies.set(COOKIE_QUERY_STRING, urlParams.q, {
        expires: COOKIES_EXPIRATION,
      })
    }

    // handle path
    Cookies.set(COOKIE_WEB_ENTRY_PAGE, document.location.pathname, {
      expires: COOKIES_EXPIRATION,
    })
  }

  // 2 - AJAXify
  $(SELECTOR_FORM).each((_, form) => {
    const apiUrl = $(form).data('url')
    const wrapperSuccessId = $(form).data('success')
    const wrapperErrorId = $(form).data('error')
    const wrapperErrorMsgId = $(form).data('msg')

    $(form).on('submit', function (e) {
      e.preventDefault()

      const formData = new FormData(this)
      const cookies = Cookies.get()
      Object.keys(cookies).forEach((key) => {
        if (!formData.has(key)) {
          formData.append(key, cookies[key])
        }
      })
      formData.append(FORM_SUBMIT_PAGE, document.location.pathname)

      $.ajax({
        url: apiUrl,
        type: 'POST',
        data: formData,
        contentType: false,
        cache: false,
        processData: false,
        beforeSend: () => {
          $(`#${wrapperSuccessId}`).fadeOut()
          $(`#${wrapperErrorId}`).fadeOut()
        },
        success: (data) => {
          dataLayer.push({
            event: 'ga.event',
            eCat: 'form-submit',
            eAct: 'název formu atribut',
            eLab: document.location.pathname,
          })
          this.reset()
          $(`#${wrapperSuccessId}`).fadeIn()
        },
        error: (e) => {
          $(`#${wrapperErrorMsgId}`).text(e.responseJSON.message)
          $(`#${wrapperErrorId}`).fadeIn()
        },
      })
    })
  })

  // 3 - search
  $(SELECTOR_PICKER_STREET).attr('disabled', true)
  $(SELECTOR_PICKER_CITY).on('change', () => {
    $(SELECTOR_PICKER_STREET).attr('disabled', false)
  })

  $(SELECTOR_PICKER_CITY).select2({
    width: '100%',
    placeholder: 'Vyberte obec',
    minimumInputLength: 0,
    ajax: {
      url: `${API}/village/search-list`,
      dataType: 'json',
      delay: 250,
      data: (params) => {
        var query = {
          villageString: params.term,
        }
        return query
      },
      processResults: (data) => {
        if (data.villages.length === 0) {
          $(SELECTOR_PICKER_CITY).html(`<option selected value="${$('input.select2-search__field').val()}"></option>`)
        }
        return {
          results: $.map(data.villages, (el, id) => {
            return {
              text: el,
              id: id,
            }
          }),
        }
      },
    },
    language: {
      noResults: () => {
        return 'Nic nenalezeno'
      },
      inputTooShort: () => {
        return 'Začněte psát název města'
      },
      searching: () => {
        return 'Vyhledávám...'
      },
    },
  })

  $(SELECTOR_PICKER_STREET).select2({
    width: '100%',
    placeholder: 'Vyberte ulici',
    minimumInputLength: 2,
    ajax: {
      url: `${API}/street/search-list`,
      dataType: 'json',
      delay: 250,
      data: (params) => {
        var query = {
          villageId: $(SELECTOR_PICKER_CITY).find('option').last()[0].value,
          streetString: params.term,
        }
        return query
      },
      processResults: (data) => {
        if (data.streets.length === 0) {
          $('.form-calculate select.selectpickerStreet').html(
            `<option selected value="${$('input.select2-search__field').val()}"></option>`
          )
        }
        return {
          results: $.map(data.streets, (el, id) => {
            return {
              text: el,
              id: id,
            }
          }),
        }
      },
    },
    language: {
      noResults: () => {
        return 'Nic nenalezeno'
      },
      inputTooShort: () => {
        return 'Začněte psát název ulice'
      },
      searching: () => {
        return 'Vyhledávám...'
      },
    },
  })

  // 4 - slider
  $(SELECTOR_SLIDER_INPUT).on('input', (e) => {
    const input = new Big(e.target.value)
    $(SELECTOR_SLIDER_INPUT_VALUE).text(input.toNumber().toLocaleString(SELECTOR_SLIDER_LOCALE))
    const meResult = input
      .minus(input.times(1.75).div(12))
      .minus(1100)
      .round(-1)
      .toNumber()
      .toLocaleString(SELECTOR_SLIDER_LOCALE)
    $(SELECTOR_SLIDER_RESULT_ME).text(meResult)
    const inResult = input.times(0.88).round(-1).toNumber().toLocaleString(SELECTOR_SLIDER_LOCALE)
    $(SELECTOR_SLIDER_RESULT_IN).text(inResult)
  })
  $(SELECTOR_SLIDER_INPUT).trigger('input')

  // 5 - translation
  const toggleToEn = (replaceState = false) => {
    $(SELECTOR_TRANSLATION_TOGGLE_EN).hide()
    $(SELECTOR_TRANSLATION_CONTENT_CS).hide()
    $(SELECTOR_TRANSLATION_TOGGLE_CS).show()
    $(SELECTOR_TRANSLATION_CONTENT_EN).show()
    Cookies.set('lang', 'en', { expires: COOKIES_EXPIRATION })
    if (replaceState) {
      window.history.replaceState(null, null, `?${queryString.stringify({ ...urlParams, lang: 'en' })}`)
    }
  }

  const toggleToCs = (replaceState = false) => {
    $(SELECTOR_TRANSLATION_TOGGLE_CS).hide()
    $(SELECTOR_TRANSLATION_CONTENT_EN).hide()
    $(SELECTOR_TRANSLATION_TOGGLE_EN).show()
    $(SELECTOR_TRANSLATION_CONTENT_CS).show()
    Cookies.set('lang', 'cs', { expires: COOKIES_EXPIRATION })
    if (replaceState) {
      window.history.replaceState(null, null, `?${queryString.stringify({ ...urlParams, lang: 'cs' })}`)
    }
  }

  if (Cookies.get(COOKIE_LANG) === 'en') {
    toggleToEn()
  } else {
    toggleToCs()
  }

  $(SELECTOR_TRANSLATION_TOGGLE_EN).on('click', () => {
    toggleToEn(true)
  })

  $(SELECTOR_TRANSLATION_TOGGLE_CS).on('click', () => {
    toggleToCs(true)
  })

  // 6 - datepicker - type="date" doesn't work correctly across browsers, please use type="text"
  const picker = datepicker(SELECTOR_INPUT_DATEPICKER, {
    onSelect: (instance, date) => {
      // TODO - process values somehow
    },
    formatter: (input, date, instance) => {
      const value = date.toLocaleDateString('cs-CZ')
      input.value = value
    },
  })
})
